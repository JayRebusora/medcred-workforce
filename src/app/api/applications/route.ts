// POST creates a new Application row. No auth required — this is the
// public-facing endpoint the /apply form submits to.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { applicationSchema } from "@/lib/validation/application";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = applicationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const data = parsed.data;

  // Idempotency check: if there's already a PENDING application with this
  // email, bounce — one active application at a time.
  const existing = await prisma.application.findFirst({
    where: { email: data.email, status: "PENDING" },
  });
  if (existing) {
    return NextResponse.json(
      {
        error:
          "There's already a pending application for this email address. Please wait for it to be reviewed.",
      },
      { status: 409 },
    );
  }

  // Also reject if an active User already exists for this email
  const existingUser = await prisma.user.findFirst({
    where: { email: data.email, deletedAt: null },
  });
  if (existingUser) {
    return NextResponse.json(
      {
        error:
          "An account already exists for this email. Please sign in instead.",
      },
      { status: 409 },
    );
  }

  const application = await prisma.application.create({
    data: {
      roleType: data.roleType,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,

      // Employee fields
      employeeType: data.employeeType,
      yearsOfExperience: data.yearsOfExperience,

      // Facility fields
      facilityName: data.facilityName,
      addressLine1: data.addressLine1,
      city: data.city,
      state: data.state,
      zipCode: data.zipCode,

      // Credentials claimed (stored as JSON)
      documents: data.credentials
        ? JSON.parse(JSON.stringify(data.credentials))
        : null,
    },
  });

  return NextResponse.json({ id: application.id }, { status: 201 });
}
