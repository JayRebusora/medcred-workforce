// src/app/(auth)/apply/thanks/page.tsx
// Post-submission confirmation. No personal data shown — we don't know
// which application the visitor just submitted (we could pass an id but
// it adds noise; a generic thanks page is fine).

import Link from "next/link";

export default function ApplyThanksPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-emerald-600"
          >
            <path d="M4 10l4 4 8-8" />
          </svg>
        </div>

        <h1 className="text-2xl font-semibold text-slate-900">
          Application received
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Thanks for applying to MedCred Workforce. An administrator will review
          your submission within 48 hours. If approved, you&rsquo;ll receive an
          email with a secure link to set up your account.
        </p>

        <div className="mt-8">
          <Link
            href="/"
            className="text-sm font-medium text-slate-700 hover:underline"
          >
            &larr; Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
