// src/app/api/applications/[id]/route.ts
// PATCH — approve or decline an application. Admin only.
//
// Body: { action: "APPROVE" | "DECLINE", note?: string }
//   - APPROVE: note optional. Generates InviteToken, "sends" invite email.
//     Returns { status: "APPROVED", setupUrl: string } — setupUrl is the
//     raw token URL, returned so the admin UI can display it for demo purposes.
//     In production the raw URL would only go into the email, not the response.
//   - DECLINE: note required. "Sends" decline email. Returns { status: "DECLINED" }.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateInviteToken, tokenExpiry } from "@/lib/tokens";
import { sendInviteEmail, sendDeclineEmail, getAppBaseUrl } from "@/lib/email";

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("APPROVE"),
    note: z.string().trim().max(2000).optional(),
  }),
  z.object({
    action: z.literal("DECLINE"),
    note: z
      .string()
      .trim()
      .min(1, "A note is required when declining")
      .max(2000),
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

  // 2. Parse inputs
  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { action, note } = parsed.data;

  // 3. Load the application
  const application = await prisma.application.findUnique({ where: { id } });
  if (!application) {
    return NextResponse.json(
      { error: "Application not found" },
      { status: 404 },
    );
  }
  if (application.status !== "PENDING") {
    return NextResponse.json(
      { error: `Application already ${application.status.toLowerCase()}` },
      { status: 409 },
    );
  }

  // 4. Perform the action
  if (action === "APPROVE") {
    const { raw, hash } = generateInviteToken();
    const expiresAt = tokenExpiry();

    await prisma.$transaction([
      prisma.application.update({
        where: { id },
        data: {
          status: "APPROVED",
          adminNote: note ?? null,
          reviewedAt: new Date(),
          reviewedById: session.user.id,
        },
      }),
      prisma.inviteToken.create({
        data: {
          token: hash,
          email: application.email,
          applicationId: id,
          expiresAt,
        },
      }),
    ]);

    const setupUrl = `${getAppBaseUrl()}/setup-password?token=${raw}`;
    await sendInviteEmail({
      to: application.email,
      firstName: application.firstName,
      setupUrl,
    });

    return NextResponse.json({
      status: "APPROVED",
      setupUrl, // For demo — production API would typically omit this.
      expiresAt: expiresAt.toISOString(),
    });
  }

  // DECLINE
  await prisma.application.update({
    where: { id },
    data: {
      status: "DECLINED",
      adminNote: note,
      reviewedAt: new Date(),
      reviewedById: session.user.id,
    },
  });

  await sendDeclineEmail({
    to: application.email,
    firstName: application.firstName,
    note,
  });

  return NextResponse.json({ status: "DECLINED" });
}
