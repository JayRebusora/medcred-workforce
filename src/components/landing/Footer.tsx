import Link from "next/link";

export function Footer() {
  return (
    <footer className="relative border-t border-line-soft mt-12">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-16">
          <div>
            <span className="display text-3xl text-ink">medcred</span>
            <p className="mt-3 text-sm text-muted leading-relaxed max-w-[26ch]">
              Healthcare staffing built around credentials, not calendars.
            </p>
          </div>

          <div>
            <div className="eyebrow mb-3">Platform</div>
            <ul className="space-y-2 text-sm text-muted">
              <li>
                <Link
                  href="/login"
                  className="hover:text-ink transition-colors"
                >
                  Sign in
                </Link>
              </li>
              <li>
                <Link
                  href="/apply"
                  className="hover:text-ink transition-colors"
                >
                  Apply
                </Link>
              </li>
              <li>
                <Link href="#how" className="hover:text-ink transition-colors">
                  How it works
                </Link>
              </li>
              <li>
                <Link
                  href="#features"
                  className="hover:text-ink transition-colors"
                >
                  Features
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <div className="eyebrow mb-3">For everyone</div>
            <ul className="space-y-2 text-sm text-muted">
              <li>
                <Link
                  href="/apply?role=employee"
                  className="hover:text-ink transition-colors"
                >
                  Healthcare workers
                </Link>
              </li>
              <li>
                <Link
                  href="/apply?role=facility"
                  className="hover:text-ink transition-colors"
                >
                  Facilities
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-ink transition-colors">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-ink transition-colors">
                  Terms
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 pt-8 border-t border-line-soft flex flex-col md:flex-row justify-between gap-4 text-xs text-mute2">
          <span>© 2026 MedCred Workforce. A capstone project.</span>
          <span className="mono">
            v0.2 · built with Next.js · Prisma · Neon
          </span>
        </div>
      </div>
    </footer>
  );
}
