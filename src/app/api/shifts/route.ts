// src/app/api/shifts/route.ts
// POST — create a new shift. Admin only. Facilities have their own path (issue #5).
//
// Request body (Zod-validated):
//   {
//     facilityId: string
//     title: string
//     description?: string
//     startAt: string  (ISO)
//     endAt: string    (ISO)
//     allowedEmployeeTypes: EmployeeType[]   (non-empty)
//     extraRequiredCredentials?: CredentialType[]
//     hourlyRate?: number
//   }
//
// Returns 201 { id } on success.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { EmployeeType, CredentialType } from "@prisma/client";

const bodySchema = z
  .object({
    facilityId: z.string().cuid(),
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
  // 1. AuthZ — admin only
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
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

  // 3. Verify the facility exists and is active
  const facility = await prisma.facility.findFirst({
    where: { id: data.facilityId, deletedAt: null },
  });
  if (!facility) {
    return NextResponse.json({ error: "Facility not found" }, { status: 404 });
  }

  // 4. Create the shift
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
