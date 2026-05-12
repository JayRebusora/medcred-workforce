// src/app/(app)/credentials/[id]/page.tsx
// Admin view of a single credential, with Approve and Reject actions.
// Both actions are server actions that call the PATCH /api/credentials/[id]
// endpoint internally, so the API is the single source of truth for the
// state-change logic (we don't duplicate it across the UI and the API).
//
// Approve: instant, no note required.
// Reject: requires a note explaining why. Stored on Credential.adminNote.

import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CredentialStatus } from "@prisma/client";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ flash?: string }>;
};

export default async function AdminCredentialDetailPage({
  params,
  searchParams,
}: Props) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard");

  const { id } = await params;
  const sp = await searchParams;

  const credential = await prisma.credential.findFirst({
    where: { id, deletedAt: null },
    include: {
      employee: {
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
        },
      },
    },
  });

  if (!credential) {
    return (
      <div className="p-6">
        <p className="text-sm text-slate-600">Credential not found.</p>
        <Link
          href="/credentials"
          className="mt-4 inline-block text-sm font-medium text-slate-700 hover:underline"
        >
          &larr; Back to credentials
        </Link>
      </div>
    );
  }

  const now = new Date();
  const isExpired = credential.expiryDate < now;
  const canAct = credential.status === CredentialStatus.PENDING;

  // ─── Server actions ────────────────────────────────────────────────

  async function approve() {
    "use server";
    await callPatch(id, { action: "APPROVE" });
    revalidatePath("/credentials");
    revalidatePath(`/credentials/${id}`);
    redirect(`/credentials/${id}?flash=approved`);
  }

  async function reject(formData: FormData) {
    "use server";
    const note = (formData.get("note") as string | null)?.trim();
    if (!note) {
      // Should be prevented by required field on the form, but defense-in-depth
      redirect(`/credentials/${id}?flash=needs-note`);
    }
    await callPatch(id, { action: "REJECT", note });
    revalidatePath("/credentials");
    revalidatePath(`/credentials/${id}`);
    redirect(`/credentials/${id}?flash=rejected`);
  }

  // ─── Flash ─────────────────────────────────────────────────────────
  const flash =
    sp.flash === "approved"
      ? {
          kind: "success" as const,
          message: "Credential approved. It now counts for shift eligibility.",
        }
      : sp.flash === "rejected"
        ? {
            kind: "info" as const,
            message: "Credential rejected. The employee will see your note.",
          }
        : sp.flash === "needs-note"
          ? {
              kind: "error" as const,
              message: "A note is required when rejecting a credential.",
            }
          : null;

  return (
    <div className="p-6">
      <Link
        href="/credentials"
        className="mb-4 inline-block text-sm text-slate-600 hover:text-slate-900"
      >
        &larr; Back to credentials
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {credential.type.replace(/_/g, " ")}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Submitted by {credential.employee.user.firstName}{" "}
            {credential.employee.user.lastName} on{" "}
            {credential.createdAt.toLocaleDateString()}
          </p>
        </div>
        <StatusBadge status={credential.status} isExpired={isExpired} />
      </div>

      {flash && (
        <div
          role="alert"
          className={`mb-5 rounded-md border px-4 py-3 text-sm ${
            flash.kind === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : flash.kind === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-slate-200 bg-slate-50 text-slate-700"
          }`}
        >
          {flash.message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left column — credential details */}
        <div className="space-y-4 lg:col-span-2">
          <Card title="Credential">
            <Row k="Type">
              <span className="font-medium text-slate-900">
                {credential.type.replace(/_/g, " ")}
              </span>
            </Row>
            <Row k="Number">
              <span className="font-mono text-sm text-slate-700">
                {credential.credentialNumber ?? "—"}
              </span>
            </Row>
            <Row k="Issuing body">
              <span className="text-slate-700">
                {credential.issuingBody ?? "—"}
              </span>
            </Row>
            <Row k="Issued date">
              <span className="text-slate-700">
                {credential.issuedDate.toLocaleDateString()}
              </span>
            </Row>
            <Row k="Expiry date">
              <span className={isExpired ? "text-red-700" : "text-slate-700"}>
                {credential.expiryDate.toLocaleDateString()}
                {isExpired && (
                  <span className="ml-2 text-[10px] uppercase tracking-wider text-red-600 font-medium">
                    expired
                  </span>
                )}
              </span>
            </Row>
            <Row k="Document">
              {credential.documentUrl ? (
                <a
                  href={credential.documentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-slate-700 hover:underline"
                >
                  View document →
                </a>
              ) : (
                <span className="text-sm text-slate-500">Not provided</span>
              )}
            </Row>
          </Card>

          <Card title="Employee">
            <Row k="Name">
              <span className="font-medium text-slate-900">
                {credential.employee.user.firstName}{" "}
                {credential.employee.user.lastName}
              </span>
            </Row>
            <Row k="Email">
              <span className="text-slate-700">
                {credential.employee.user.email}
              </span>
            </Row>
            <Row k="Employee type">
              <span className="text-slate-700">
                {credential.employee.employeeType.replace(/_/g, " ")}
              </span>
            </Row>
          </Card>

          {credential.adminNote && (
            <Card
              title={`${credential.status === "REJECTED" ? "Rejection" : "Admin"} note`}
            >
              <p className="px-4 py-3 text-sm text-slate-700">
                {credential.adminNote}
              </p>
            </Card>
          )}
        </div>

        {/* Right column — action panel */}
        <div>
          {canAct ? (
            <ActionPanel approve={approve} reject={reject} />
          ) : (
            <NonActionablePanel status={credential.status} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────

async function callPatch(
  id: string,
  body: { action: "APPROVE" } | { action: "REJECT"; note: string },
) {
  "use server";
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const res = await fetch(`${proto}://${host}/api/credentials/${id}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      cookie: h.get("cookie") ?? "",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(errBody.error ?? "Request failed");
  }
}

// ─── Subcomponents ─────────────────────────────────────────────────

function ActionPanel({
  approve,
  reject,
}: {
  approve: () => void;
  reject: (fd: FormData) => void;
}) {
  return (
    <div className="space-y-3">
      {/* Approve */}
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-slate-900">
          Approve credential
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Marks this credential as verified. The employee will become eligible
          for shifts that require it.
        </p>
        <form action={approve} className="mt-4">
          <button
            type="submit"
            className="w-full rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-800"
          >
            Approve
          </button>
        </form>
      </div>

      {/* Reject — requires a note */}
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-slate-900">
          Reject credential
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          The employee will see your note. They can resubmit a corrected
          credential afterward.
        </p>
        <form action={reject} className="mt-4 space-y-3">
          <div>
            <label className="block text-[10px] font-medium uppercase tracking-wider text-slate-500">
              Reason
            </label>
            <textarea
              name="note"
              required
              rows={3}
              maxLength={2000}
              placeholder="e.g. License number doesn't match issuing body records."
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 shadow-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 shadow-sm transition hover:bg-red-50"
          >
            Reject with note
          </button>
        </form>
      </div>
    </div>
  );
}

function NonActionablePanel({ status }: { status: CredentialStatus }) {
  const message =
    status === CredentialStatus.APPROVED
      ? "This credential is approved and active for shift eligibility checks."
      : status === CredentialStatus.REJECTED
        ? "This credential was rejected. The employee can submit a corrected version."
        : "This credential is no longer reviewable.";
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
        Status
      </p>
      <p className="mt-2 text-sm text-slate-600">{message}</p>
    </div>
  );
}

// ─── UI primitives ─────────────────────────────────────────────────

function StatusBadge({
  status,
  isExpired,
}: {
  status: CredentialStatus;
  isExpired: boolean;
}) {
  // If APPROVED but expired, show as EXPIRED in the badge
  const displayStatus =
    status === CredentialStatus.APPROVED && isExpired ? "EXPIRED" : status;

  const map = {
    APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    PENDING: "bg-amber-50 text-amber-700 border-amber-200",
    REJECTED: "bg-red-50 text-red-700 border-red-200",
    EXPIRED: "bg-slate-100 text-slate-700 border-slate-200",
  } as const;
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-medium ${map[displayStatus]}`}
    >
      {displayStatus}
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
    <div className="flex items-center justify-between px-4 py-2.5 gap-3">
      <dt className="text-xs text-slate-500 shrink-0">{k}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}
