// src/app/(app)/shifts/[id]/page.tsx
// Shift detail page — now with the credential-aware assignment UI.
//
// For admins viewing an OPEN shift: runs the eligibility engine live
// against all active employees and shows two sections:
//   - Eligible (green, with "Propose" button)
//   - Ineligible (red, with specific reasons shown)
//
// For everyone else, or non-OPEN shifts: read-only view of the shift
// and its existing assignments.

import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  evaluateEmployees,
  type CredentialMatrix,
  type EngineCredential,
  type EngineEmployee,
  type EligibilityResult,
} from "@/lib/eligibility";
import {
  AssignmentStatus,
  CredentialType,
  EmployeeType,
  ShiftStatus,
} from "@prisma/client";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ flash?: string }>;
};

export default async function ShiftDetailPage({ params, searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const sp = await searchParams;

  const shift = await prisma.shift.findFirst({
    where: { id, deletedAt: null },
    include: {
      facility: true,
      assignments: {
        include: {
          employee: { include: { user: true } },
        },
      },
    },
  });

  if (!shift) {
    return (
      <div className="p-6">
        <p className="text-sm text-slate-600">Shift not found.</p>
        <Link
          href="/shifts"
          className="mt-4 inline-block text-sm font-medium text-slate-700 hover:underline"
        >
          &larr; Back to shifts
        </Link>
      </div>
    );
  }

  // Access control
  const role = session.user.role;
  if (role === "CLIENT") {
    const facility = await prisma.facility.findUnique({
      where: { userId: session.user.id },
    });
    if (!facility || shift.facilityId !== facility.id) redirect("/dashboard");
  } else if (role === "EMPLOYEE") {
    const employee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
    });
    const isAssigned = employee
      ? shift.assignments.some((a) => a.employeeId === employee.id)
      : false;
    if (!isAssigned) redirect("/dashboard");
  }

  // ─── Run the eligibility engine for admins viewing an OPEN shift ───
  const showEngine = role === "ADMIN" && shift.status === ShiftStatus.OPEN;
  let eligibilityResults: EligibilityResult[] = [];

  if (showEngine) {
    const employees = await prisma.employee.findMany({
      where: { deletedAt: null },
      include: {
        user: { select: { firstName: true, lastName: true } },
        credentials: { where: { deletedAt: null } },
        assignments: {
          where: {
            status: {
              in: [AssignmentStatus.PROPOSED, AssignmentStatus.CONFIRMED],
            },
          },
          include: {
            shift: { select: { id: true, startAt: true, endAt: true } },
          },
        },
      },
    });

    const matrix = await loadCredentialMatrix();

    const engineEmployees: EngineEmployee[] = employees.map((e) => ({
      id: e.id,
      firstName: e.user.firstName,
      lastName: e.user.lastName,
      employeeType: e.employeeType,
      credentials: e.credentials.map(
        (c) =>
          ({
            id: c.id,
            type: c.type,
            status: c.status,
            expiryDate: c.expiryDate,
            deletedAt: c.deletedAt,
          }) satisfies EngineCredential,
      ),
      activeAssignments: e.assignments.map((a) => ({
        shiftId: a.shift.id,
        shiftStartAt: a.shift.startAt,
        shiftEndAt: a.shift.endAt,
        status: a.status,
      })),
    }));

    eligibilityResults = evaluateEmployees(engineEmployees, shift, matrix);
  }

  // ─── Server action: propose an assignment ──────────────────────────
  async function propose(formData: FormData) {
    "use server";
    const employeeId = formData.get("employeeId") as string | null;
    if (!employeeId) redirect(`/shifts/${id}?flash=missing-employee`);

    const h = await headers();
    const host = h.get("host") ?? "localhost:3000";
    const proto = h.get("x-forwarded-proto") ?? "http";

    const res = await fetch(`${proto}://${host}/api/shifts/${id}/assign`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: h.get("cookie") ?? "",
      },
      body: JSON.stringify({ employeeId }),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      const msg = body.error ?? "Assignment failed";
      redirect(`/shifts/${id}?flash=error-${encodeURIComponent(msg)}`);
    }

    revalidatePath("/shifts");
    revalidatePath(`/shifts/${id}`);
    redirect(`/shifts/${id}?flash=assigned`);
  }

  // ─── Flash ─────────────────────────────────────────────────────────
  let flash: { kind: "success" | "error"; message: string } | null = null;
  if (sp.flash === "assigned") {
    flash = {
      kind: "success",
      message: "Assignment proposed. Employee has been notified.",
    };
  } else if (sp.flash?.startsWith("error-")) {
    flash = {
      kind: "error",
      message: decodeURIComponent(sp.flash.slice("error-".length)),
    };
  }

  // Group results for display
  const eligible = eligibilityResults.filter((r) => r.eligible);
  const ineligible = eligibilityResults.filter((r) => !r.eligible);

  return (
    <div className="p-6">
      <Link
        href="/shifts"
        className="mb-4 inline-block text-sm text-slate-600 hover:text-slate-900"
      >
        &larr; Back to shifts
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {shift.title}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {shift.facility.name} &middot;{" "}
            {shift.startAt.toLocaleString([], {
              dateStyle: "medium",
              timeStyle: "short",
            })}{" "}
            &mdash;{" "}
            {shift.endAt.toLocaleString([], {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        </div>
        <StatusBadge status={shift.status} />
      </div>

      {flash && (
        <div
          role="alert"
          className={`mb-5 rounded-md border px-4 py-3 text-sm ${
            flash.kind === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {flash.message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left column: shift info + assignments */}
        <div className="space-y-4 lg:col-span-2">
          {shift.description && (
            <Card title="Description">
              <p className="px-4 py-3 text-sm text-slate-700">
                {shift.description}
              </p>
            </Card>
          )}

          <Card title="Requirements">
            <Row k="Allowed employee types">
              <div className="flex flex-wrap gap-1.5">
                {shift.allowedEmployeeTypes.map((t) => (
                  <Chip key={t}>{t.replace(/_/g, " ")}</Chip>
                ))}
              </div>
            </Row>
            <Row k="Extra required credentials">
              {shift.extraRequiredCredentials.length === 0 ? (
                <span className="text-xs text-slate-500">
                  None (baseline only)
                </span>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {shift.extraRequiredCredentials.map((c) => (
                    <Chip key={c}>{c.replace(/_/g, " ")}</Chip>
                  ))}
                </div>
              )}
            </Row>
            {shift.hourlyRate !== null && (
              <Row k="Hourly rate">
                <span className="font-mono text-sm text-slate-900">
                  ${shift.hourlyRate.toString()}
                </span>
              </Row>
            )}
          </Card>

          <Card title={`Assignments (${shift.assignments.length})`}>
            {shift.assignments.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">
                No assignments yet.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-2 font-medium">Employee</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium">Cred check</th>
                  </tr>
                </thead>
                <tbody>
                  {shift.assignments.map((a) => (
                    <tr
                      key={a.id}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="px-4 py-2.5 text-slate-900">
                        {a.employee.user.firstName} {a.employee.user.lastName}
                      </td>
                      <td className="px-4 py-2.5 text-slate-700">{a.status}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            a.credentialCheckPassed
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {a.credentialCheckPassed ? "PASSED" : "FAILED"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>

        {/* Right column: the engine UI (admin + OPEN shift only) */}
        <div>
          {showEngine ? (
            <EligibilityPanel
              eligible={eligible}
              ineligible={ineligible}
              propose={propose}
            />
          ) : (
            <NonEngineCard shiftStatus={shift.status} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Subcomponents ─────────────────────────────────────────────────────

function EligibilityPanel({
  eligible,
  ineligible,
  propose,
}: {
  eligible: EligibilityResult[];
  ineligible: EligibilityResult[];
  propose: (fd: FormData) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-2.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            Eligible ({eligible.length})
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Credentials verified against shift requirements.
          </p>
        </div>

        {eligible.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-slate-500">
            No eligible employees found. Check requirements or credential
            approvals.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {eligible.map((r) => (
              <li key={r.employeeId} className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      {r.employeeName}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {r.satisfiedBy.length} credential
                      {r.satisfiedBy.length === 1 ? "" : "s"} verified
                    </p>
                    {r.expiringDuringShift.length > 0 && (
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-amber-700">
                        <span
                          className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500"
                          aria-hidden
                        />
                        Expires during shift:{" "}
                        {r.expiringDuringShift
                          .map((c) => c.replace(/_/g, " "))
                          .join(", ")}
                      </p>
                    )}
                  </div>
                  <form action={propose}>
                    <input
                      type="hidden"
                      name="employeeId"
                      value={r.employeeId}
                    />
                    <button
                      type="submit"
                      className="shrink-0 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-slate-800"
                    >
                      Propose
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-2.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            Ineligible ({ineligible.length})
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Blocked by the compliance engine. No override available.
          </p>
        </div>

        {ineligible.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-slate-500">
            All active employees are eligible.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {ineligible.map((r) => (
              <li key={r.employeeId} className="p-3">
                <p className="text-sm font-medium text-slate-800">
                  {r.employeeName}
                </p>
                <ul className="mt-1.5 space-y-0.5 text-xs text-red-700">
                  {r.reasons.includes("TYPE_MISMATCH") && (
                    <li>· Role type not allowed on this shift</li>
                  )}
                  {r.reasons.includes("MISSING_CREDENTIAL") && (
                    <li>
                      · Missing or invalid:{" "}
                      <span className="font-mono">
                        {r.missing.map((c) => c.replace(/_/g, " ")).join(", ")}
                      </span>
                    </li>
                  )}
                  {r.reasons.includes("SCHEDULE_CONFLICT") && (
                    <li>· Already assigned to an overlapping shift</li>
                  )}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function NonEngineCard({ shiftStatus }: { shiftStatus: ShiftStatus }) {
  const message =
    shiftStatus === ShiftStatus.OPEN
      ? "Only administrators can propose assignments."
      : `This shift is ${shiftStatus.toLowerCase().replace(/_/g, " ")}; no further assignments can be made.`;

  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
        Assignment
      </p>
      <p className="mt-2 text-sm text-slate-600">{message}</p>
    </div>
  );
}

// ─── UI primitives ────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const classes =
    status === "OPEN"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : status === "ASSIGNED"
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : status === "IN_PROGRESS"
          ? "bg-blue-50 text-blue-700 border-blue-200"
          : status === "COMPLETED"
            ? "bg-slate-100 text-slate-700 border-slate-200"
            : "bg-red-50 text-red-700 border-red-200";
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-medium ${classes}`}
    >
      {status}
    </span>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-2.5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
          {title}
        </h3>
      </div>
      <div className="divide-y divide-slate-100">{children}</div>
    </div>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <dt className="text-xs text-slate-500">{k}</dt>
      <dd className="ml-4">{children}</dd>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-slate-700">
      {children}
    </span>
  );
}

// ─── Helper: load credential matrix ──────────────────────────────────

async function loadCredentialMatrix(): Promise<CredentialMatrix> {
  const rows = await prisma.credentialRequirement.findMany();
  const matrix = {} as CredentialMatrix;
  for (const t of Object.values(EmployeeType)) {
    matrix[t] = [];
  }
  for (const row of rows) {
    matrix[row.employeeType].push(row.credentialType);
  }
  return matrix;
}
