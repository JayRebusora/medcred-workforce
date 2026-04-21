// src/app/api/shifts/route.ts
// POST — create a new shift.
//
// Access:
//   - ADMIN  : must provide facilityId in body; can create for any facility
//   - CLIENT : facilityId is IGNORED; derived from the session's facility
//   - others : 401 Unauthorized

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { EmployeeType, CredentialType } from "@prisma/client";

const bodySchema = z
  .object({
    // Optional because CLIENT role doesn't need to send it (and we ignore it if they do)
    facilityId: z.string().cuid().optional(),
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(5000).optional(),
    startAt: z.string().datetime(),
    endAt: z.string().datetime(),
    allowedEmployeeTypes: z
      .array(z.nativeEnum(EmployeeType))
      .min(1, "At least one employee type is required"),
    extraRequiredCredentials: z.array(z.nativeEnum(CredentialType)).optional(),
    hourlyRate: z.number().nonnegative().optional(),
  })
  .refine((d) => new Date(d.endAt) > new Date(d.startAt), {
    message: "endAt must be after startAt",
    path: ["endAt"],
  });

export async function POST(req: NextRequest) {
  // 1. AuthZ — admins or facility clients
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
  const data = parsed.data;

  // 3. Resolve facilityId depending on role
  let facilityId: string;
  if (role === "ADMIN") {
    if (!data.facilityId) {
      return NextResponse.json(
        { error: "facilityId is required for admin requests" },
        { status: 400 },
      );
    }
    facilityId = data.facilityId;
  } else {
    // CLIENT — derive from session. Ignore any facilityId they sent.
    const facility = await prisma.facility.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!facility) {
      return NextResponse.json(
        { error: "No facility profile linked to your account" },
        { status: 403 },
      );
    }
    facilityId = facility.id;
  }

  // 4. Verify the facility exists and is active
  const facility = await prisma.facility.findFirst({
    where: { id: facilityId, deletedAt: null },
  });
  if (!facility) {
    return NextResponse.json({ error: "Facility not found" }, { status: 404 });
  }

  // 5. Create the shift
  const shift = await prisma.shift.create({
    data: {
      facilityId: facility.id,
      title: data.title,
      description: data.description,
      startAt: new Date(data.startAt),
      endAt: new Date(data.endAt),
      allowedEmployeeTypes: data.allowedEmployeeTypes,
      extraRequiredCredentials: data.extraRequiredCredentials ?? [],
      hourlyRate: data.hourlyRate,
      // status defaults to OPEN
    },
    select: { id: true },
  });

  return NextResponse.json({ id: shift.id }, { status: 201 });
}
