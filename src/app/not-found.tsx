// Custom 404 page for the entire app. Replaces Next.js's default
// "404 — This page could not be found" with a branded MedCred experience.
//
// Next.js automatically renders this file for any unmatched route.
// Server component — no client interaction needed.

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="eyebrow mb-3">404</div>
        <h1
          className="display text-ink"
          style={{
            fontSize: "clamp(2.25rem, 6vw, 4rem)",
            letterSpacing: "-0.035em",
            lineHeight: "1.05",
          }}
        >
          Page not found
        </h1>
        <p className="mt-5 text-base text-muted leading-relaxed">
          We can't find what you were looking for. The page may have been moved,
          or the link may be out of date.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
          <Link href="/" className="btn-ink">
            Back to home
          </Link>
          <Link href="/login" className="btn-ghost">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
