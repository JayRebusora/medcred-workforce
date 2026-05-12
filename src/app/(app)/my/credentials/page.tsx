// src/app/(app)/my/credentials/page.tsx
// Employee credentials list. Shows the credentials the employee owns
// with status, issued/expiry dates, and a "Renew" link when a credential
// is within 60 days of expiry (or already expired).
//
// REJECTED credentials show the admin's note inline beneath the row so
// the employee knows what to fix before resubmitting.

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CredentialStatus } from "@prisma/client";

const RENEWAL_WINDOW_DAYS = 60;

type Props = {
  searchParams: Promise<{ flash?: string }>;
};

export default async function MyCredentialsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || session.user.role !== "EMPLOYEE") {
    redirect("/dashboard");
  }

  const sp = await searchParams;

  const employee = await prisma.employee.findUnique({
    where: { userId: session.user.id },
    include: {
      credentials: {
        where: { deletedAt: null },
        orderBy: [{ type: "asc" }, { expiryDate: "desc" }],
      },
    },
  });

  if (!employee) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          No employee profile found for your account. Contact an administrator.
        </div>
      </div>
    );
  }

  const now = new Date();
  const renewalThreshold = new Date(now);
  renewalThreshold.setDate(renewalThreshold.getDate() + RENEWAL_WINDOW_DAYS);

  const credentials = employee.credentials.map((c) => {
    const expired = c.expiryDate < now;
    const expiringSoon =
      !expired &&
      c.expiryDate < renewalThreshold &&
      c.status === CredentialStatus.APPROVED;
    return { ...c, expired, expiringSoon };
  });

  const latestByType = new Map<string, string>();
  for (const c of credentials) {
    if (!latestByType.has(c.type)) {
      latestByType.set(c.type, c.id);
    }
  }

  const flashMessage =
    sp.flash === "added"
      ? {
          kind: "success" as const,
          message:
            "Credential submitted. An administrator will review it shortly.",
        }
      : sp.flash === "renewed"
        ? {
            kind: "success" as const,
            message:
              "Renewal submitted. The new credential is pending admin review.",
          }
        : null;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            My Credentials
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Your licenses and certifications. Submit new credentials or renew
            expiring ones — an administrator will verify before they count for
            shift eligibility.
          </p>
        </div>
        <Link
          href="/my/credentials/new"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
        >
          + Add credential
        </Link>
      </div>

      {flashMessage && (
        <div
          role="alert"
          className={`mb-5 rounded-md border px-4 py-3 text-sm ${
            flashMessage.kind === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-slate-200 bg-slate-50 text-slate-700"
          }`}
        >
          {flashMessage.message}
        </div>
      )}

      {credentials.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-5 py-2.5 font-medium">Type</th>
                <th className="px-5 py-2.5 font-medium">Number</th>
                <th className="px-5 py-2.5 font-medium">Issuing body</th>
                <th className="px-5 py-2.5 font-medium">Issued</th>
                <th className="px-5 py-2.5 font-medium">Expires</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
                <th className="px-5 py-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {credentials.map((c) => {
                const isLatestOfType = latestByType.get(c.type) === c.id;
                const showRenew =
                  isLatestOfType &&
                  (c.expiringSoon || c.expired) &&
                  c.status === CredentialStatus.APPROVED;
                const showResubmit =
                  isLatestOfType && c.status === CredentialStatus.REJECTED;
                const showNote =
                  c.status === CredentialStatus.REJECTED && c.adminNote;

                return (
                  <>
                    {/* Main row */}
                    <tr
                      key={c.id}
                      className={`border-b ${
                        showNote ? "border-slate-50" : "border-slate-100"
                      } last:border-0`}
                    >
                      <td className="px-5 py-3.5 text-slate-900 font-medium">
                        {c.type.replace(/_/g, " ")}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-700">
                        {c.credentialNumber ?? "—"}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {c.issuingBody ?? "—"}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {c.issuedDate.toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={
                            c.expired
                              ? "text-red-700"
                              : c.expiringSoon
                                ? "text-amber-700"
                                : "text-slate-600"
                          }
                        >
                          {c.expiryDate.toLocaleDateString()}
                        </span>
                        {c.expired &&
                          c.status === CredentialStatus.APPROVED && (
                            <span className="ml-2 text-[10px] uppercase tracking-wider text-red-600 font-medium">
                              expired
                            </span>
                          )}
                        {c.expiringSoon && (
                          <span className="ml-2 text-[10px] uppercase tracking-wider text-amber-600 font-medium">
                            expiring
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {showRenew ? (
                          <Link
                            href={`/my/credentials/new?renew=${c.id}`}
                            className="text-sm font-medium text-slate-700 hover:text-slate-900 hover:underline"
                          >
                            Renew →
                          </Link>
                        ) : showResubmit ? (
                          <Link
                            href={`/my/credentials/new?renew=${c.id}`}
                            className="text-sm font-medium text-slate-700 hover:text-slate-900 hover:underline"
                          >
                            Resubmit →
                          </Link>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>

                    {/* Rejection note row — full width inset under the main row */}
                    {showNote && (
                      <tr
                        key={`${c.id}-note`}
                        className="border-b border-slate-100 last:border-0 bg-red-50/40"
                      >
                        <td colSpan={7} className="px-5 py-3">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 shrink-0">
                              <RejectIcon />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-semibold uppercase tracking-wider text-red-700">
                                Admin note
                              </p>
                              <p className="mt-0.5 text-sm text-slate-800 leading-relaxed">
                                {c.adminNote}
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {credentials.length > 0 && (
        <p className="mt-4 text-xs text-slate-500">
          A credential within 60 days of expiry (or already expired) can be
          renewed. Rejected credentials can be resubmitted with corrections.
          Renewal and resubmission both create a new pending credential — your
          existing records stay intact for audit purposes.
        </p>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: CredentialStatus }) {
  const map = {
    APPROVED: {
      label: "Approved",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    PENDING: {
      label: "Pending review",
      className: "bg-amber-50 text-amber-700 border-amber-200",
    },
    REJECTED: {
      label: "Rejected",
      className: "bg-red-50 text-red-700 border-red-200",
    },
    EXPIRED: {
      label: "Expired",
      className: "bg-slate-100 text-slate-600 border-slate-200",
    },
  } as const;
  const cfg = map[status];
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${cfg.className}`}
    >
      {cfg.label}
    </span>
  );
}

function RejectIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" stroke="#b91c1c" strokeWidth="1.25" />
      <path
        d="M5.5 5.5L10.5 10.5M10.5 5.5L5.5 10.5"
        stroke="#b91c1c"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
      <h3 className="text-base font-medium text-slate-900">
        No credentials on file
      </h3>
      <p className="mt-1 text-sm text-slate-500">
        Add your licenses and certifications so you can be matched to shifts
        you're qualified for.
      </p>
      <Link
        href="/my/credentials/new"
        className="mt-5 inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
      >
        Add your first credential
      </Link>
    </div>
  );
}
