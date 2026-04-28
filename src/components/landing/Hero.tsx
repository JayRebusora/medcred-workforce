import Link from "next/link";

export function Hero() {
  return (
    <section className="relative">
      <div className="mx-auto max-w-6xl px-6 pt-20 md:pt-28 pb-12 text-center stagger">
        {/* Eyebrow chip */}
        <div className="rise-sm flex justify-center">
          <span className="chip chip-accent">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full bg-current"
              style={{ animation: "glow-pulse 2s ease-in-out infinite" }}
            />
            Credentialed healthcare staffing
          </span>
        </div>

        {/* Display headline — one line, scales fluidly with viewport.
            clamp(min, preferred, max): scales from 2.5rem on tiny screens
            to ~7rem on huge displays, hitting ~10vw in between. */}
        <h1
          className="rise display mt-10 whitespace-nowrap"
          style={{
            fontSize: "clamp(2.5rem, 10.5vw, 8.5rem)",
            letterSpacing: "-0.045em",
            lineHeight: "1",
          }}
        >
          <span className="text-ink">Apply.</span>{" "}
          <span style={{ color: "var(--color-ink-soft)", fontWeight: 500 }}>
            Verify.
          </span>{" "}
          <span className="text-ink">Work.</span>
        </h1>

        {/* Subhead */}
        <p className="rise mx-auto mt-10 max-w-xl text-base md:text-lg leading-relaxed text-muted">
          The healthcare staffing platform that checks credentials before it
          checks calendars. Get matched to shifts you're qualified for —
          automatically, transparently, with compliance built in.
        </p>

        {/* CTAs */}
        <div className="rise mt-10 flex items-center justify-center gap-3 flex-wrap">
          <Link href="/apply" className="btn-ink">
            Start an application
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M2 7h10M8 3l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
          <Link href="/login" className="btn-ghost">
            Sign in to your account
          </Link>
        </div>

        {/* Trust line */}
        <p className="rise mt-8 text-xs text-mute2">
          Built for nurses, respiratory therapists, CNAs, and the facilities
          that staff them.
        </p>
      </div>
    </section>
  );
}
