// src/app/api/credentials/route.ts
// POST — create a new credential.
//
// Access: EMPLOYEE only. The employee is derived from the session,
// never from the request body. This prevents one employee from
// creating a credential on another's account.
//
// Body: {
//   type: CredentialType
//   credentialNumber?: string
//   issuingBody?: string
//   issuedDate: ISO datetime string
//   expiryDate: ISO datetime string
//   documentUrl?: string
// }
//
// Returns 201 { id } on success. Status defaults to PENDING regardless
// of what (if anything) the client sent — admin must approve before
// the credential counts for shift eligibility.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CredentialStatus, CredentialType } from "@prisma/client";

const bodySchema = z
  .object({
    type: z.nativeEnum(CredentialType),
    credentialNumber: z.string().trim().max(100).optional(),
    issuingBody: z.string().trim().max(200).optional(),
    issuedDate: z.string().datetime(),
    expiryDate: z.string().datetime(),
    documentUrl: z.string().trim().url().max(2000).optional(),
  })
  .refine((d) => new Date(d.expiryDate) > new Date(d.issuedDate), {
    message: "expiryDate must be after issuedDate",
    path: ["expiryDate"],
  });

export async function POST(req: NextRequest) {
  // 1. AuthZ — must be an employee
  const session = await auth();
  if (!session?.user || session.user.role !== "EMPLOYEE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Resolve the Employee from the session.
  // We use session.user.id (the User id), not anything from the body.
  const employee = await prisma.employee.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!employee) {
    return NextResponse.json(
      { error: "No employee profile linked to your account" },
      { status: 403 },
    );
  }

  // 3. Parse body
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
  const data = parsed.data;

  // 4. Create the credential. Status is PENDING regardless of input —
  // admins are the only ones who can move a credential to APPROVED.
  const cred = await prisma.credential.create({
    data: {
      employeeId: employee.id,
      type: data.type,
      credentialNumber: data.credentialNumber,
      issuingBody: data.issuingBody,
      issuedDate: new Date(data.issuedDate),
      expiryDate: new Date(data.expiryDate),
      documentUrl: data.documentUrl,
      status: CredentialStatus.PENDING,
    },
    select: { id: true },
  });

  return NextResponse.json({ id: cred.id }, { status: 201 });
}
