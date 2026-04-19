// src/app/(auth)/apply/page.tsx
// Redesigned /apply placeholder. Uses the same split-screen as login so they
// feel like a cohesive set. Keeps the "under construction" framing honest while
// still looking designed.

import Link from "next/link";
import { Lockup } from "@/components/brand/Lockup";
import { CredentialLattice } from "@/components/brand/CredentialLattice";

export default function ApplyPage() {
  return (
    <div className="flex min-h-screen bg-white">
      {/* Left panel — editorial */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-slate-50 px-12 py-10 lg:flex lg:w-[44%]">
        <div className="relative z-10">
          <Lockup size="md" />
        </div>

        <div className="absolute inset-x-0 top-24 flex justify-center opacity-80">
          <CredentialLattice className="w-[520px] max-w-full" />
        </div>
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-50/70 to-slate-50"
        />

        <div className="relative z-10 max-w-sm">
          <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
            What to expect
          </p>
          <ol className="space-y-4 text-sm text-slate-700">
            <ApplyStep n="01" label="Role" body="Employee or facility." />
            <ApplyStep
              n="02"
              label="Personal info"
              body="Name, contact, location."
            />
            <ApplyStep
              n="03"
              label="Professional details"
              body="Role type, years of experience."
            />
            <ApplyStep
              n="04"
              label="Credentials"
              body="Upload license and certifications."
            />
            <ApplyStep
              n="05"
              label="Review & submit"
              body="Confirm and send to admin review."
            />
          </ol>
        </div>
      </aside>

      {/* Right panel */}
      <main className="flex w-full flex-col justify-between p-6 lg:w-[56%] lg:px-16 lg:py-10">
        <div className="flex items-center justify-between lg:hidden">
          <Lockup size="sm" />
          <Link
            href="/"
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            &larr; Home
          </Link>
        </div>

        <div className="hidden items-center justify-end lg:flex">
          <Link
            href="/"
            className="text-sm text-slate-600 transition hover:text-slate-900"
          >
            &larr; Back to home
          </Link>
        </div>

        <div className="mx-auto w-full max-w-sm py-12">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
            Application
          </p>
          <h1
            className="text-4xl leading-tight text-slate-900"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Coming soon.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            The 5-step application wizard is under construction. Once live,
            prospective employees and partner facilities will be able to submit
            credentials for review and receive a secure invite link upon
            approval.
          </p>

          <div className="mt-8 rounded-lg border border-slate-200 bg-slate-50/70 p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
              Current status
            </p>
            <div className="mt-2 flex items-center gap-2.5 text-sm">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-slate-700">In active development</span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              Expected to ship with the next release. Check back shortly, or
              reach out to an administrator if you have a time-sensitive
              application.
            </p>
          </div>

          <p className="mt-8 text-center text-xs text-slate-500">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-slate-700 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-slate-200 pt-6 text-xs text-slate-500">
          <span className="font-mono uppercase tracking-wider">
            Applications reviewed within 48 hours
          </span>
          <span className="font-mono uppercase tracking-wider">
            &copy; {new Date().getFullYear()}
          </span>
        </div>
      </main>
    </div>
  );
}

function ApplyStep({
  n,
  label,
  body,
}: {
  n: string;
  label: string;
  body: string;
}) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 shrink-0 font-mono text-xs text-slate-400">
        {n}
      </span>
      <div>
        <p className="font-medium text-slate-900">{label}</p>
        <p className="text-xs text-slate-500">{body}</p>
      </div>
    </li>
  );
}
