// src/app/(auth)/setup-password/page.tsx
// Applicant password setup. The server action posts to /api/setup-password
// so the logic stays in one place (the API route). Validation of the token
// for initial page-load still happens here directly, because we want to
// show a friendly page state (not POST) when the token is already bad.

import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";

type Props = {
  searchParams: Promise<{ token?: string; error?: string }>;
};

// Initial token validation for UI — returns application context or a reason
async function loadTokenContext(raw: string) {
  const tokenHash = hashToken(raw);
  const token = await prisma.inviteToken.findUnique({
    where: { token: tokenHash },
  });
  if (!token) return { reason: "invalid" as const };
  if (token.usedAt) return { reason: "used" as const };
  if (token.expiresAt < new Date()) return { reason: "expired" as const };
  if (!token.applicationId) return { reason: "invalid" as const };

  const application = await prisma.application.findUnique({
    where: { id: token.applicationId },
  });
  if (!application || application.status !== "APPROVED") {
    return { reason: "invalid" as const };
  }
  return { token, application };
}

async function internalUrl(path: string) {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}${path}`;
}

export default async function SetupPasswordPage({ searchParams }: Props) {
  const params = await searchParams;

  if (!params.token) {
    return (
      <ErrorState
        title="Missing token"
        body="This link is missing its invite token. Please use the link from your invitation email."
      />
    );
  }

  const ctx = await loadTokenContext(params.token);
  if ("reason" in ctx) {
    const copy = {
      invalid: {
        title: "Invalid invite link",
        body: "This invite link is not recognized. Please contact an administrator for a new invitation.",
      },
      expired: {
        title: "Invite link expired",
        body: "This invite link has expired. Please contact an administrator to request a new one.",
      },
      used: {
        title: "Invite already used",
        body: "This invite link has already been used to create an account. If you've already set up your password, just sign in.",
      },
    }[ctx.reason];
    return <ErrorState title={copy.title} body={copy.body} showSignIn />;
  }

  const { application } = ctx;

  // ─── Server action: thin wrapper over /api/setup-password ────────

  async function setupAccount(formData: FormData) {
    "use server";
    const raw = (formData.get("token") as string | null) ?? "";
    const password = (formData.get("password") as string | null) ?? "";
    const confirmPassword =
      (formData.get("confirmPassword") as string | null) ?? "";

    if (password !== confirmPassword) {
      redirect(
        `/setup-password?token=${encodeURIComponent(raw)}&error=mismatch`,
      );
    }

    const res = await fetch(await internalUrl(`/api/setup-password`), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: raw, password }),
    });
    const body = (await res.json()) as { email?: string; error?: string };

    if (!res.ok) {
      // The API returns codes like INVALID / EXPIRED / USED / WEAK
      const code = (body.error ?? "INVALID").toLowerCase();
      redirect(
        `/setup-password?token=${encodeURIComponent(raw)}&error=${code}`,
      );
    }

    redirect(
      `/login?setup=complete&email=${encodeURIComponent(body.email ?? "")}`,
    );
  }

  const errorMessages: Record<string, string> = {
    mismatch: "Passwords don't match.",
    weak: "Password must be at least 8 characters.",
    invalid: "This invite link is no longer valid.",
    expired: "This invite link has expired.",
    used: "This invite has already been used.",
  };
  const errorMessage = params.error ? errorMessages[params.error] : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">
          Set up your password
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Welcome, {application.firstName}. Choose a password to finish setting
          up your MedCred account.
        </p>

        <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <p>
            <span className="font-medium text-slate-700">Email:</span>{" "}
            {application.email}
          </p>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {errorMessage}
          </div>
        )}

        <form action={setupAccount} className="mt-6 space-y-4">
          <input type="hidden" name="token" value={params.token} />

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-600"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
            <p className="mt-1 text-xs text-slate-500">Minimum 8 characters.</p>
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-600"
            >
              Confirm password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <button
            type="submit"
            className="mt-2 w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
          >
            Create account
          </button>
        </form>
      </div>
    </div>
  );
}

function ErrorState({
  title,
  body,
  showSignIn = false,
}: {
  title: string;
  body: string;
  showSignIn?: boolean;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-600">{body}</p>
        <div className="mt-6 flex justify-center gap-4 text-sm">
          <Link href="/" className="font-medium text-slate-700 hover:underline">
            Home
          </Link>
          {showSignIn && (
            <Link
              href="/login"
              className="font-medium text-slate-700 hover:underline"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
