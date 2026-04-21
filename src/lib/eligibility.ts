// src/lib/eligibility.ts
// The credential-aware eligibility engine. Given a shift and its pool of
// employees (with credentials loaded), decide who can be assigned.
//
// This module is a PURE function — no Next.js, no Prisma calls. It takes
// plain data in and returns plain data out. The caller (API route, server
// component) is responsible for loading the data from Prisma first.
//
// Why pure? Because it makes this logic:
//   - unit-testable without a DB
//   - reusable from cron jobs, server actions, and API routes
//   - easy to reason about in isolation
//
// Capstone-worthy note: this is the file to point at during the defense.
// It encodes the domain rules of healthcare staffing compliance.

import {
  CredentialStatus,
  CredentialType,
  EmployeeType,
  ShiftStatus,
  AssignmentStatus,
} from "@prisma/client";

// ─── Input shapes ─────────────────────────────────────────────────────

/** A credential belonging to some employee. Trimmed to the fields the engine needs. */
export type EngineCredential = {
  id: string;
  type: CredentialType;
  status: CredentialStatus;
  expiryDate: Date;
  deletedAt: Date | null;
};

/** An employee available for matching. */
export type EngineEmployee = {
  id: string;
  firstName: string;
  lastName: string;
  employeeType: EmployeeType;
  credentials: EngineCredential[];
  /** Their currently-active assignments (any status in [PROPOSED, CONFIRMED, IN_PROGRESS]-like)
   *  with the shift's start/end so we can detect conflicts. */
  activeAssignments: Array<{
    shiftId: string;
    shiftStartAt: Date;
    shiftEndAt: Date;
    status: AssignmentStatus;
  }>;
};

/** The shift we're matching against. */
export type EngineShift = {
  id: string;
  startAt: Date;
  endAt: Date;
  allowedEmployeeTypes: EmployeeType[];
  extraRequiredCredentials: CredentialType[];
  status: ShiftStatus;
};

/** Map from EmployeeType → list of baseline required CredentialTypes.
 *  Caller loads this from the CredentialRequirement table once and passes it in. */
export type CredentialMatrix = Record<EmployeeType, CredentialType[]>;

// ─── Output shapes ────────────────────────────────────────────────────

export type IneligibleReason =
  | "TYPE_MISMATCH" // employeeType not in shift.allowedEmployeeTypes
  | "MISSING_CREDENTIAL" // required credential not held (or not approved, or expired)
  | "SCHEDULE_CONFLICT"; // already assigned to an overlapping shift

/** Per-employee result. */
export type EligibilityResult = {
  employeeId: string;
  employeeName: string;
  eligible: boolean;
  /** Why not eligible (empty if eligible). A given employee can have multiple
   *  reasons (e.g., type mismatch AND schedule conflict), so it's an array. */
  reasons: IneligibleReason[];
  /** Required credential types the employee is missing or has invalid. */
  missing: CredentialType[];
  /** Approved, non-expired-for-shift credentials that will expire BEFORE
   *  shift.endAt. Informational only — does NOT make the employee ineligible. */
  expiringDuringShift: CredentialType[];
  /** The approved credentials that satisfied the requirements. Populated
   *  for both eligible and ineligible results (lets the UI show what was
   *  found even if one was missing). */
  satisfiedBy: Array<{
    credentialId: string;
    type: CredentialType;
    expiryDate: Date;
  }>;
  /** List of conflicting shifts, if SCHEDULE_CONFLICT is among the reasons. */
  conflictingShiftIds: string[];
};

/** The snapshot captured when an assignment is made. This is what gets
 *  stored in ShiftAssignment.credentialCheckSnapshot (Json). */
export type AssignmentSnapshot = {
  checkedAt: string; // ISO
  required: CredentialType[];
  verified: Array<{
    id: string;
    type: CredentialType;
    status: CredentialStatus;
    expiryDate: string; // ISO
  }>;
  missing: CredentialType[];
};

// ─── The engine ───────────────────────────────────────────────────────

/** Compute required credentials for a shift: per-type baseline ∪ per-shift extras. */
export function requiredCredentialsFor(
  shift: Pick<EngineShift, "extraRequiredCredentials">,
  employeeType: EmployeeType,
  matrix: CredentialMatrix,
): CredentialType[] {
  const baseline = matrix[employeeType] ?? [];
  const extras = shift.extraRequiredCredentials ?? [];
  // De-dupe: extras might overlap with baseline
  return Array.from(new Set([...baseline, ...extras]));
}

/** Does this credential satisfy a requirement for a shift starting at startAt?
 *  Criteria: not soft-deleted, APPROVED, expiryDate >= shift.startAt. */
export function credentialValidForShift(
  cred: EngineCredential,
  shiftStartAt: Date,
): boolean {
  if (cred.deletedAt !== null) return false;
  if (cred.status !== CredentialStatus.APPROVED) return false;
  if (cred.expiryDate < shiftStartAt) return false;
  return true;
}

/** Does assignment A conflict with shift B (by time overlap)?
 *  Standard half-open interval overlap: A.start < B.end AND B.start < A.end. */
export function timesOverlap(
  a: { startAt: Date; endAt: Date },
  b: { startAt: Date; endAt: Date },
): boolean {
  return a.startAt < b.endAt && b.startAt < a.endAt;
}

/** The main function: evaluate a single employee against a shift. */
export function evaluateEmployee(
  employee: EngineEmployee,
  shift: EngineShift,
  matrix: CredentialMatrix,
): EligibilityResult {
  const reasons: IneligibleReason[] = [];

  // 1. Type match
  const typeMatch = shift.allowedEmployeeTypes.includes(employee.employeeType);
  if (!typeMatch) reasons.push("TYPE_MISMATCH");

  // 2. Credential match — do they have all required, valid for shift.startAt?
  const required = requiredCredentialsFor(shift, employee.employeeType, matrix);
  const missing: CredentialType[] = [];
  const satisfiedBy: EligibilityResult["satisfiedBy"] = [];
  const expiringDuringShift: CredentialType[] = [];

  for (const reqType of required) {
    // Find the best matching credential (if multiple, pick the one with
    // latest expiry — the employee's "best" proof of this type).
    const candidates = employee.credentials
      .filter(
        (c) => c.type === reqType && credentialValidForShift(c, shift.startAt),
      )
      .sort((a, b) => b.expiryDate.getTime() - a.expiryDate.getTime());

    const best = candidates[0];
    if (!best) {
      missing.push(reqType);
      continue;
    }

    satisfiedBy.push({
      credentialId: best.id,
      type: best.type,
      expiryDate: best.expiryDate,
    });

    // Informational: this credential is valid for shift start but expires
    // before the shift ends. Doesn't block assignment, but worth surfacing.
    if (best.expiryDate < shift.endAt) {
      expiringDuringShift.push(best.type);
    }
  }

  if (missing.length > 0) reasons.push("MISSING_CREDENTIAL");

  // 3. Schedule conflicts — overlapping active assignments
  const conflictingShiftIds = employee.activeAssignments
    .filter((a) => a.shiftId !== shift.id) // don't flag this shift as its own conflict
    .filter(
      (a) =>
        // Only block on assignments that are live: PROPOSED or CONFIRMED.
        // Declined / no-show / completed don't block.
        a.status === AssignmentStatus.PROPOSED ||
        a.status === AssignmentStatus.CONFIRMED,
    )
    .filter((a) =>
      timesOverlap(
        { startAt: a.shiftStartAt, endAt: a.shiftEndAt },
        { startAt: shift.startAt, endAt: shift.endAt },
      ),
    )
    .map((a) => a.shiftId);

  if (conflictingShiftIds.length > 0) reasons.push("SCHEDULE_CONFLICT");

  const eligible = reasons.length === 0;

  return {
    employeeId: employee.id,
    employeeName: `${employee.firstName} ${employee.lastName}`,
    eligible,
    reasons,
    missing,
    expiringDuringShift,
    satisfiedBy,
    conflictingShiftIds,
  };
}

/** Evaluate many employees against one shift. Returns them sorted:
 *  eligible first (by name), then ineligible (by name). */
export function evaluateEmployees(
  employees: EngineEmployee[],
  shift: EngineShift,
  matrix: CredentialMatrix,
): EligibilityResult[] {
  const results = employees.map((e) => evaluateEmployee(e, shift, matrix));
  results.sort((a, b) => {
    if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
    return a.employeeName.localeCompare(b.employeeName);
  });
  return results;
}

/** Build the immutable snapshot to store on ShiftAssignment. Called at the
 *  moment of assignment; encodes what the system knew about the employee's
 *  credentials right then. */
export function buildAssignmentSnapshot(
  result: EligibilityResult,
  credentials: EngineCredential[],
): AssignmentSnapshot {
  return {
    checkedAt: new Date().toISOString(),
    required: [
      ...new Set([...result.satisfiedBy.map((s) => s.type), ...result.missing]),
    ],
    verified: result.satisfiedBy.map((s) => {
      const cred = credentials.find((c) => c.id === s.credentialId);
      return {
        id: s.credentialId,
        type: s.type,
        status: cred?.status ?? CredentialStatus.APPROVED,
        expiryDate: s.expiryDate.toISOString(),
      };
    }),
    missing: result.missing,
  };
}
