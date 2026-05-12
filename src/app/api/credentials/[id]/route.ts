// src/app/api/credentials/[id]/route.ts
// PATCH — admin approves or rejects a credential.
//
// Body: { action: "APPROVE" } | { action: "REJECT", note: string }
//
// AuthZ: admin only. Other roles get 401.
// State guard: only PENDING credentials can be acted on. Acting on
// already-approved or already-rejected credentials returns 409.
//
// Side effects: once a credential moves to APPROVED, it counts toward
// shift eligibility on the next assignment check (no further action
// needed — the engine reads live).

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CredentialStatus } from "@prisma/client";

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("APPROVE") }),
  z.object({
    action: z.literal("REJECT"),
    note: z.string().trim().min(1, "Note is required when rejecting").max(2000),
  }),
]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // 1. AuthZ — admin only
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
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

  // 3. Load the credential and verify it exists + is reviewable
  const credential = await prisma.credential.findFirst({
    where: { id, deletedAt: null },
  });
  if (!credential) {
    return NextResponse.json(
      { error: "Credential not found" },
      { status: 404 },
    );
  }
  if (credential.status !== CredentialStatus.PENDING) {
    return NextResponse.json(
      {
        error: `Credential is ${credential.status.toLowerCase()}, cannot be changed`,
      },
      { status: 409 },
    );
  }

  // 4. Perform the action
  if (parsed.data.action === "APPROVE") {
    const updated = await prisma.credential.update({
      where: { id },
      data: {
        status: CredentialStatus.APPROVED,
        adminNote: null, // Clear any previous note if this is being re-approved
      },
      select: { id: true, status: true },
    });
    return NextResponse.json({ id: updated.id, status: updated.status });
  }

  // REJECT — store the note alongside the status change
  const updated = await prisma.credential.update({
    where: { id },
    data: {
      status: CredentialStatus.REJECTED,
      adminNote: parsed.data.note,
    },
    select: { id: true, status: true },
  });

  return NextResponse.json({ id: updated.id, status: updated.status });
}
