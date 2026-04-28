import Link from "next/link";

export function Header() {
  return (
    <header
      className="sticky top-0 z-50 backdrop-blur-md border-b border-line-soft"
      style={{ backgroundColor: "rgba(244, 245, 247, 0.78)" }}
    >
      <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 group">
          <Logomark />
          <span className="display text-xl tracking-tight text-ink">
            medcred
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm text-muted">
          <Link href="#how" className="hover:text-ink transition-colors">
            How it works
          </Link>
          <Link href="#features" className="hover:text-ink transition-colors">
            Features
          </Link>
          <Link href="#audiences" className="hover:text-ink transition-colors">
            Who it's for
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/login" className="btn-ghost hidden sm:inline-flex">
            Sign in
          </Link>
          <Link href="/apply" className="btn-ink">
            Apply
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
        </div>
      </div>
    </header>
  );
}

// A tiny custom logomark — three vertical bars rising, suggesting credentials
// and connection. Better than a stock heart-with-pulse.
function Logomark() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="2" y="11" width="3" height="9" rx="1" fill="#0b1220" />
      <rect x="7" y="6" width="3" height="14" rx="1" fill="#0b1220" />
      <rect x="12" y="2" width="3" height="18" rx="1" fill="#0b1220" />
      <circle cx="18" cy="4" r="2" fill="#047857" />
    </svg>
  );
}
