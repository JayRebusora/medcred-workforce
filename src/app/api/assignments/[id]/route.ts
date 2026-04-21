// src/app/api/assignments/[id]/route.ts
// PATCH — an employee confirms or declines an assignment they've been
// proposed. On decline, the shift flips back to OPEN so admin can re-assign.
//
// Body: { action: "CONFIRM" | "DECLINE", note?: string }
// Returns 200 { status } on success.
//
// AuthZ: the signed-in employee must own this assignment. Admins do NOT
// use this endpoint — they'd use a future cancel/reassign endpoint.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AssignmentStatus, ShiftStatus } from "@prisma/client";

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("CONFIRM") }),
  z.object({
    action: z.literal("DECLINE"),
    note: z.string().trim().max(2000).optional(),
  }),
]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // 1. AuthZ — must be an employee
  const session = await auth();
  if (!session?.user || session.user.role !== "EMPLOYEE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

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

  // 3. Load the assignment and verify ownership
  const assignment = await prisma.shiftAssignment.findUnique({
    where: { id },
    include: {
      shift: true,
      employee: { select: { userId: true } },
    },
  });
  if (!assignment) {
    return NextResponse.json(
      { error: "Assignment not found" },
      { status: 404 },
    );
  }
  if (assignment.employee.userId !== session.user.id) {
    // Do NOT leak existence of other employees' assignments
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // 4. Only PROPOSED assignments can be confirmed/declined by the employee
  if (assignment.status !== AssignmentStatus.PROPOSED) {
    return NextResponse.json(
      {
        error: `Assignment is ${assignment.status.toLowerCase()}, cannot be changed`,
      },
      { status: 409 },
    );
  }

  // 5. Perform the action atomically
  if (parsed.data.action === "CONFIRM") {
    const updated = await prisma.shiftAssignment.update({
      where: { id },
      data: { status: AssignmentStatus.CONFIRMED },
    });
    // Shift stays ASSIGNED (it already moved there on propose).
    return NextResponse.json({ status: updated.status });
  }

  // DECLINE — move assignment to DECLINED, move shift back to OPEN so admin
  // can reassign. Transaction ensures both happen or neither.
  const { note } = parsed.data;
  const updated = await prisma.$transaction(async (tx) => {
    const upd = await tx.shiftAssignment.update({
      where: { id },
      data: {
        status: AssignmentStatus.DECLINED,
        note: note ?? null,
      },
    });

    // Only reopen the shift if it's currently ASSIGNED — don't clobber a
    // shift that's already moved past (e.g., IN_PROGRESS, COMPLETED, CANCELLED)
    if (assignment.shift.status === ShiftStatus.ASSIGNED) {
      await tx.shift.update({
        where: { id: assignment.shiftId },
        data: { status: ShiftStatus.OPEN },
      });
    }

    return upd;
  });

  return NextResponse.json({ status: updated.status });
}
