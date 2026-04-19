// src/app/page.tsx
// Public landing page. Editorial-clinical aesthetic: serif display type,
// the credential lattice as the visual anchor, measured typography.

import Link from "next/link";
import { Lockup } from "@/components/brand/Lockup";
import { CredentialLattice } from "@/components/brand/CredentialLattice";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Lockup size="md" />
          <nav className="flex items-center gap-5">
            <Link
              href="/login"
              className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
            >
              Sign in
            </Link>
            <Link
              href="/apply"
              className="rounded-md bg-slate-900 px-4 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
            >
              Apply now
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-grid">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-6 py-24 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-7">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs text-slate-600 shadow-sm backdrop-blur">
              <span
                className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"
                aria-hidden
              />
              <span className="font-mono uppercase tracking-wider">
                Credential compliance · verified in real time
              </span>
            </div>

            <h1
              className="text-5xl leading-[1.05] text-slate-900 sm:text-6xl"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Staffing that won&rsquo;t let a{" "}
              <em className="italic text-slate-600">lapsed credential</em> onto
              the floor.
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
              MedCred Workforce connects credentialed healthcare professionals
              to hospital shifts &mdash; with automated compliance checks,
              role-based portals, and an immutable audit trail from application
              to assignment.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/apply"
                className="rounded-md bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
              >
                Apply to join
              </Link>
              <Link
                href="/login"
                className="rounded-md border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Sign in
              </Link>
            </div>

            {/* Mini caption — adds credibility */}
            <div className="mt-10 flex items-center gap-6 text-xs text-slate-500">
              <div>
                <p className="font-mono uppercase tracking-wider">Built for</p>
                <p className="mt-1 font-medium text-slate-700">
                  Hospitals · Clinics · Staffing agencies
                </p>
              </div>
              <div className="h-10 w-px bg-slate-200" />
              <div>
                <p className="font-mono uppercase tracking-wider">Stack</p>
                <p className="mt-1 font-medium text-slate-700">
                  Next.js · PostgreSQL · Prisma
                </p>
              </div>
            </div>
          </div>

          {/* The credential lattice — the signature visual */}
          <div className="relative flex items-center lg:col-span-5">
            <div className="relative w-full">
              <CredentialLattice className="h-auto w-full" />
              {/* Floating annotation card */}
              <div className="absolute -bottom-4 -left-4 max-w-[220px] rounded-lg border border-slate-200 bg-white p-3 shadow-md">
                <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                  Credential snapshot
                </p>
                <div className="mt-2 space-y-1 text-xs text-slate-700">
                  <div className="flex items-center justify-between">
                    <span>Approved</span>
                    <span className="font-mono text-slate-900">47</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Pending review</span>
                    <span className="font-mono text-amber-700">4</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Expired</span>
                    <span className="font-mono text-red-700">2</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature row */}
      <section className="border-t border-slate-200 bg-slate-50/50">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="mb-3 text-center font-mono text-xs uppercase tracking-[0.2em] text-slate-500">
            How it works
          </p>
          <h2
            className="mb-12 text-center text-3xl text-slate-900"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Compliance is the default, not an afterthought.
          </h2>

          <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
            <Feature
              num="01"
              title="Credential-aware assignment"
              body="Shifts check license and certification status at assignment time. Expired or missing credentials block the assignment automatically — no override, no exceptions."
            />
            <Feature
              num="02"
              title="Role-based portals"
              body="Administrators, employees, and facilities each see a portal built around their workflow, not a one-size-fits-all dashboard with permissions hacked on top."
            />
            <Feature
              num="03"
              title="Immutable audit trail"
              body="Every assignment captures a snapshot of the credential check, frozen in time. When an auditor asks why a staff member worked a shift, the answer is already there."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-xs text-slate-500">
          <Lockup size="sm" />
          <p className="font-mono uppercase tracking-wider">
            &copy; {new Date().getFullYear()} MedCred Workforce
          </p>
        </div>
      </footer>
    </div>
  );
}

function Feature({
  num,
  title,
  body,
}: {
  num: string;
  title: string;
  body: string;
}) {
  return (
    <div className="relative">
      <p className="mb-3 font-mono text-xs tracking-wider text-slate-400">
        {num}
      </p>
      <h3
        className="mb-2 text-xl text-slate-900"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        {title}
      </h3>
      <p className="text-sm leading-relaxed text-slate-600">{body}</p>
    </div>
  );
}
