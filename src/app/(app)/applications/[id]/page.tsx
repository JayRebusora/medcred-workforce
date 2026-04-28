// Server-action handlers now delegate to the API routes rather than
// duplicating logic. The UI is identical to the previous version.

import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ flash?: string }>;
};

// This is a Helper — build an absolute URL for the internal fetch, reusing the
// request's own host. Works in dev (localhost:3000).
async function internalUrl(path: string) {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}${path}`;
}

export default async function ApplicationReviewPage({
  params,
  searchParams,
}: Props) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard");

  const { id } = await params;
  const sp = await searchParams;

  const application = await prisma.application.findUnique({ where: { id } });
  if (!application) {
    return (
      <div className="p-6">
        <p className="text-sm text-slate-600">Application not found.</p>
        <Link
          href="/applications"
          className="mt-4 inline-block text-sm font-medium text-slate-700 hover:underline"
        >
          &larr; Back to applications
        </Link>
      </div>
    );
  }

  const isPending = application.status === "PENDING";

  // ─── Wrappers that call the API ─────────────

  async function approve(formData: FormData) {
    "use server";
    const note = (formData.get("note") as string | null)?.trim() || undefined;

    const res = await fetch(await internalUrl(`/api/applications/${id}`), {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        // Forward the session cookie so the API route's auth() picks it up
        cookie: (await headers()).get("cookie") ?? "",
      },
      body: JSON.stringify({ action: "APPROVE", note }),
    });
    const body = (await res.json()) as { setupUrl?: string; error?: string };

    if (!res.ok) {
      redirect(
        `/applications/${id}?flash=error-${encodeURIComponent(body.error ?? "unknown")}`,
      );
    }

    revalidatePath("/applications");
    const flashUrl = Buffer.from(body.setupUrl ?? "").toString("base64url");
    redirect(`/applications/${id}?flash=approved-${flashUrl}`);
  }

  async function decline(formData: FormData) {
    "use server";
    const note = (formData.get("note") as string | null)?.trim();
    if (!note) {
      redirect(`/applications/${id}?flash=decline-note-required`);
    }

    const res = await fetch(await internalUrl(`/api/applications/${id}`), {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        cookie: (await headers()).get("cookie") ?? "",
      },
      body: JSON.stringify({ action: "DECLINE", note }),
    });

    if (!res.ok) {
      const body = (await res.json()) as { error?: string };
      redirect(
        `/applications/${id}?flash=error-${encodeURIComponent(body.error ?? "unknown")}`,
      );
    }

    revalidatePath("/applications");
    redirect(`/applications/${id}?flash=declined`);
  }

  // ─── Flash message handling ──────────────────────────────────────

  let flash: {
    kind: "success" | "error" | "info";
    message: string;
    url?: string;
  } | null = null;
  if (sp.flash?.startsWith("approved-")) {
    const url = Buffer.from(
      sp.flash.slice("approved-".length),
      "base64url",
    ).toString("utf8");
    flash = {
      kind: "success",
      message: "Application approved. Invite email sent.",
      url,
    };
  } else if (sp.flash === "declined") {
    flash = {
      kind: "info",
      message: "Application declined and applicant notified.",
    };
  } else if (sp.flash === "decline-note-required") {
    flash = { kind: "error", message: "A note is required when declining." };
  } else if (sp.flash?.startsWith("error-")) {
    flash = {
      kind: "error",
      message: decodeURIComponent(sp.flash.slice("error-".length)),
    };
  }

  const claimedCredentials = Array.isArray(application.documents)
    ? (application.documents as Array<{
        type: string;
        credentialNumber?: string;
        issuingBody?: string;
        issuedDate: string;
        expiryDate: string;
      }>)
    : [];

  return (
    <div className="p-6">
      <Link
        href="/applications"
        className="mb-4 inline-block text-sm text-slate-600 hover:text-slate-900"
      >
        &larr; Back to applications
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {application.firstName} {application.lastName}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Applied as{" "}
            {application.roleType === "EMPLOYEE"
              ? (application.employeeType?.replace(/_/g, " ") ?? "employee")
              : "facility"}{" "}
            · {application.createdAt.toLocaleDateString()}
          </p>
        </div>
        <StatusBadge status={application.status} />
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
          <p className="font-medium">{flash.message}</p>
          {flash.url && (
            <div className="mt-2">
              <p className="text-xs uppercase tracking-wider text-slate-500">
                Demo: setup link (normally only in email)
              </p>
              <code className="mt-1 block break-all rounded bg-white px-2 py-1.5 font-mono text-xs text-slate-800">
                {flash.url}
              </code>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <InfoCard title="Contact">
            <Row k="Email" v={application.email} />
            {application.phone && <Row k="Phone" v={application.phone} />}
          </InfoCard>

          {application.roleType === "EMPLOYEE" && (
            <>
              <InfoCard title="Professional">
                <Row
                  k="Role type"
                  v={application.employeeType?.replace(/_/g, " ") ?? "—"}
                />
                <Row
                  k="Years of experience"
                  v={String(application.yearsOfExperience ?? 0)}
                />
              </InfoCard>

              <InfoCard
                title={`Credentials claimed (${claimedCredentials.length})`}
              >
                {claimedCredentials.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-slate-500">
                    No credentials claimed.
                  </p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wider text-slate-500">
                        <th className="px-4 py-2 font-medium">Type</th>
                        <th className="px-4 py-2 font-medium">Number</th>
                        <th className="px-4 py-2 font-medium">Expires</th>
                      </tr>
                    </thead>
                    <tbody>
                      {claimedCredentials.map((c, i) => (
                        <tr
                          key={i}
                          className="border-b border-slate-100 last:border-0"
                        >
                          <td className="px-4 py-2 text-slate-900">
                            {c.type.replace(/_/g, " ")}
                          </td>
                          <td className="px-4 py-2 font-mono text-xs text-slate-600">
                            {c.credentialNumber ?? "—"}
                          </td>
                          <td className="px-4 py-2 text-slate-600">
                            {c.expiryDate}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </InfoCard>
            </>
          )}

          {application.roleType === "CLIENT" && (
            <InfoCard title="Facility">
              <Row k="Name" v={application.facilityName ?? ""} />
              <Row
                k="Address"
                v={`${application.addressLine1}, ${application.city}, ${application.state} ${application.zipCode}`}
              />
            </InfoCard>
          )}

          {application.adminNote && (
            <InfoCard title="Admin note">
              <p className="px-4 py-3 text-sm text-slate-700">
                {application.adminNote}
              </p>
            </InfoCard>
          )}
        </div>

        <div>
          {isPending ? (
            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-slate-900">
                Review action
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Approve to send an invite email. Decline to notify the applicant
                with a note.
              </p>

              <form action={approve} className="mt-4 space-y-2">
                <label className="block text-xs font-medium text-slate-600">
                  Note (optional, approve)
                </label>
                <textarea
                  name="note"
                  rows={2}
                  placeholder="Welcome aboard!"
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
                <button
                  type="submit"
                  className="w-full rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-800"
                >
                  Approve & send invite
                </button>
              </form>

              <div className="my-4 border-t border-slate-100" />

              <form action={decline} className="space-y-2">
                <label className="block text-xs font-medium text-slate-600">
                  Reason for declining (required)
                </label>
                <textarea
                  name="note"
                  rows={2}
                  required
                  placeholder="We're unable to verify your credentials at this time."
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
                <button
                  type="submit"
                  className="w-full rounded-md border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 shadow-sm transition hover:bg-red-50"
                >
                  Decline
                </button>
              </form>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs uppercase tracking-wider text-slate-500">
                Already reviewed
              </p>
              <p className="mt-1.5 text-sm text-slate-700">
                {application.status === "APPROVED"
                  ? "This application has been approved. An invite email was sent."
                  : "This application was declined."}
              </p>
              {application.reviewedAt && (
                <p className="mt-2 text-xs text-slate-500">
                  Reviewed {application.reviewedAt.toLocaleString()}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const classes =
    status === "PENDING"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : status === "APPROVED"
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : "bg-slate-100 text-slate-700 border-slate-200";
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-medium ${classes}`}
    >
      {status}
    </span>
  );
}

function InfoCard({
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

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <dt className="text-xs text-slate-500">{k}</dt>
      <dd className="text-sm text-slate-900">{v}</dd>
    </div>
  );
}
