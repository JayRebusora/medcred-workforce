import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";
import { CredentialStatus, EmployeeType, Role } from "@prisma/client";

const bodySchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type ClaimedCredential = {
  type: string;
  credentialNumber?: string;
  issuingBody?: string;
  issuedDate: string;
  expiryDate: string;
};

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "WEAK", detail: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { token: raw, password } = parsed.data;

  // 1. Look up the token by hash
  const tokenHash = hashToken(raw);
  const token = await prisma.inviteToken.findUnique({
    where: { token: tokenHash },
  });
  if (!token) {
    return NextResponse.json({ error: "INVALID" }, { status: 404 });
  }
  if (token.usedAt) {
    return NextResponse.json({ error: "USED" }, { status: 410 });
  }
  if (token.expiresAt < new Date()) {
    return NextResponse.json({ error: "EXPIRED" }, { status: 410 });
  }
  if (!token.applicationId) {
    return NextResponse.json({ error: "INVALID" }, { status: 400 });
  }

  // 2. Load the linked application; bail unless it's APPROVED
  const application = await prisma.application.findUnique({
    where: { id: token.applicationId },
  });
  if (!application || application.status !== "APPROVED") {
    return NextResponse.json({ error: "INVALID" }, { status: 400 });
  }

  // 3. Race-safety: if a User already exists for this email, something's off
  const existing = await prisma.user.findFirst({
    where: { email: application.email, deletedAt: null },
  });
  if (existing) {
    // Mark the token used so it can't be reused, and bail
    await prisma.inviteToken.update({
      where: { id: token.id },
      data: { usedAt: new Date() },
    });
    return NextResponse.json({ error: "INVALID" }, { status: 409 });
  }

  // 4. Hash password and build the nested create
  const passwordHash = await bcrypt.hash(password, 10);

  const userBase = {
    email: application.email,
    passwordHash,
    role: application.roleType as Role,
    firstName: application.firstName,
    lastName: application.lastName,
    phone: application.phone,
  };

  // 5. Create everything in a single transaction so partial failures don't
  //    leave half-built accounts behind.
  if (application.roleType === "EMPLOYEE") {
    const claimed = Array.isArray(application.documents)
      ? (application.documents as unknown as ClaimedCredential[])
      : [];

    await prisma.$transaction([
      prisma.user.create({
        data: {
          ...userBase,
          employee: {
            create: {
              employeeType: application.employeeType as EmployeeType,
              yearsOfExperience: application.yearsOfExperience ?? 0,
              credentials: {
                create: claimed.map((c) => ({
                  type: c.type as never,
                  credentialNumber: c.credentialNumber,
                  issuingBody: c.issuingBody,
                  issuedDate: new Date(c.issuedDate),
                  expiryDate: new Date(c.expiryDate),
                  status: CredentialStatus.PENDING,
                })),
              },
            },
          },
        },
      }),
      prisma.inviteToken.update({
        where: { id: token.id },
        data: { usedAt: new Date() },
      }),
    ]);
  } else {
    await prisma.$transaction([
      prisma.user.create({
        data: {
          ...userBase,
          facility: {
            create: {
              name: application.facilityName!,
              addressLine1: application.addressLine1!,
              city: application.city!,
              state: application.state!,
              zipCode: application.zipCode!,
            },
          },
        },
      }),
      prisma.inviteToken.update({
        where: { id: token.id },
        data: { usedAt: new Date() },
      }),
    ]);
  }

  return NextResponse.json({ email: application.email }, { status: 201 });
}
