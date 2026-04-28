// Access: admin only (route handler check). Facilities and employees do
// NOT assign; admins do. Admins can assign any employee to any shift as
// long as the eligibility engine clears them.
//
// Compliance: this endpoint is the canonical place where the engine runs.
// The result is frozen into ShiftAssignment.credentialCheckSnapshot so
// future changes to credentials don't change the historical record.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  buildAssignmentSnapshot,
  evaluateEmployee,
  type CredentialMatrix,
  type EngineCredential,
  type EngineEmployee,
} from "@/lib/eligibility";
import {
  AssignmentStatus,
  CredentialType,
  EmployeeType,
  ShiftStatus,
} from "@prisma/client";

const bodySchema = z.object({
  employeeId: z.string().cuid(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // 1. AuthZ
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: shiftId } = await params;

  // 2. Parse body
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { employeeId } = parsed.data;

  // 3. Load the shift — must exist and be OPEN
  const shift = await prisma.shift.findFirst({
    where: { id: shiftId, deletedAt: null },
  });
  if (!shift) {
    return NextResponse.json({ error: "Shift not found" }, { status: 404 });
  }
  if (shift.status !== ShiftStatus.OPEN) {
    return NextResponse.json(
      { error: `Shift is ${shift.status}, cannot assign` },
      { status: 409 },
    );
  }

  // 4. Load the employee with credentials and their existing active assignments
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, deletedAt: null },
    include: {
      user: { select: { firstName: true, lastName: true } },
      credentials: {
        where: { deletedAt: null },
      },
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
  if (!employee) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  // 5. Load the credential requirement matrix
  const matrix = await loadCredentialMatrix();

  // 6. Run the engine
  const engineEmployee: EngineEmployee = {
    id: employee.id,
    firstName: employee.user.firstName,
    lastName: employee.user.lastName,
    employeeType: employee.employeeType,
    credentials: employee.credentials.map(toEngineCredential),
    activeAssignments: employee.assignments.map((a) => ({
      shiftId: a.shift.id,
      shiftStartAt: a.shift.startAt,
      shiftEndAt: a.shift.endAt,
      status: a.status,
    })),
  };

  const result = evaluateEmployee(engineEmployee, shift, matrix);

  if (!result.eligible) {
    return NextResponse.json(
      {
        error: "Employee not eligible",
        reasons: result.reasons,
        missing: result.missing,
        conflictingShiftIds: result.conflictingShiftIds,
      },
      { status: 422 },
    );
  }

  // 7. Build the snapshot
  const snapshot = buildAssignmentSnapshot(result, engineEmployee.credentials);

  // 8. Create the assignment and lock the shift atomically
  try {
    const assignment = await prisma.$transaction(async (tx) => {
      // Re-read shift inside the transaction — race safety
      const fresh = await tx.shift.findUnique({ where: { id: shiftId } });
      if (!fresh || fresh.status !== ShiftStatus.OPEN) {
        throw new Error("CONCURRENT_MODIFICATION");
      }

      const created = await tx.shiftAssignment.create({
        data: {
          shiftId,
          employeeId,
          status: AssignmentStatus.PROPOSED,
          credentialCheckPassed: true,
          credentialCheckSnapshot: snapshot as unknown as object, // Prisma's Json type
          credentialCheckedAt: new Date(),
          assignedById: session.user.id,
        },
      });

      await tx.shift.update({
        where: { id: shiftId },
        data: { status: ShiftStatus.ASSIGNED },
      });

      return created;
    });

    return NextResponse.json(
      {
        assignmentId: assignment.id,
        snapshot,
      },
      { status: 201 },
    );
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "CONCURRENT_MODIFICATION") {
      return NextResponse.json(
        { error: "Shift was modified by another user. Please refresh." },
        { status: 409 },
      );
    }
    // Unique constraint: @@unique([shiftId, employeeId]) — employee already
    // assigned to this shift
    if (
      err instanceof Error &&
      "code" in err &&
      (err as { code?: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Employee is already assigned to this shift" },
        { status: 409 },
      );
    }
    throw err;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────

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

function toEngineCredential(c: {
  id: string;
  type: CredentialType;
  status: import("@prisma/client").CredentialStatus;
  expiryDate: Date;
  deletedAt: Date | null;
}): EngineCredential {
  return {
    id: c.id,
    type: c.type,
    status: c.status,
    expiryDate: c.expiryDate,
    deletedAt: c.deletedAt,
  };
}
