// Global error boundary. Catches runtime errors that escape route-level
// boundaries and renders a friendly branded message instead of a stack trace.
//
// Required to be a Client Component — receives an Error object and a
// reset() function for the user to retry.
//
// Next.js will only show this in production. In dev, you'll see the
// full stack trace overlay regardless.

"use client";

import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="eyebrow mb-3">Something went wrong</div>
        <h1
          className="display text-ink"
          style={{
            fontSize: "clamp(2.25rem, 6vw, 4rem)",
            letterSpacing: "-0.035em",
            lineHeight: "1.05",
          }}
        >
          We hit an error.
        </h1>
        <p className="mt-5 text-base text-muted leading-relaxed">
          An unexpected error occurred while loading this page. Try again, or
          head back to a known good place.
        </p>

        {error.digest && (
          <p className="mt-4 mono text-[11px] text-mute2">
            Error ref: {error.digest}
          </p>
        )}

        <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
          <button onClick={() => reset()} className="btn-ink">
            Try again
          </button>
          <Link href="/" className="btn-ghost">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
