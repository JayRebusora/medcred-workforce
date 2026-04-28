// Login page.

"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError("Invalid email or password.");
      setSubmitting(false);
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left — editorial pane */}
      <aside
        className="relative hidden lg:flex flex-col justify-between p-12"
        style={{ background: "var(--color-ink)" }}
      >
        <Link href="/" className="flex items-center gap-2 group">
          <Logomark inverted />
          <span className="display text-xl text-white">medcred</span>
        </Link>

        <div className="max-w-md">
          <div className="eyebrow" style={{ color: "rgba(255,255,255,0.5)" }}>
            Welcome back
          </div>
          <h1
            className="display flex justify-center text-white mt-4 whitespace-nowrap"
            style={{
              fontSize: "clamp(2rem, 4.5vw, 3.5rem)",
              letterSpacing: "-0.04em",
              lineHeight: "1",
            }}
          >
            Apply.{" "}
            <span style={{ color: "rgba(255,255,255,0.65)", fontWeight: 500 }}>
              Apply · Verify · Work
            </span>{" "}
            Work.
          </h1>
          <p
            className="mt-6 text-sm leading-relaxed max-w-sm"
            style={{ color: "rgba(255,255,255,0.7)" }}
          >
            Healthcare staffing that checks credentials before it checks
            calendars.
          </p>
        </div>

        <div
          className="text-xs mono"
          style={{ color: "rgba(255,255,255,0.35)" }}
        >
          v0.2 · Capstone project · 2026
        </div>
      </aside>

      {/* Right — form pane */}
      <main className="flex flex-col">
        <header className="lg:hidden p-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Logomark />
            <span className="display text-xl text-ink">medcred</span>
          </Link>
        </header>

        <div className="flex-1 flex items-center justify-center p-6 md:p-12">
          <div className="w-full max-w-sm">
            <div className="lg:hidden eyebrow mb-2">Welcome back</div>
            <h2 className="display text-3xl text-ink">Sign in</h2>
            <p className="mt-2 text-sm text-muted">
              New here?{" "}
              <Link
                href="/apply"
                className="text-ink underline-offset-4 hover:underline"
              >
                Start an application →
              </Link>
            </p>

            <form onSubmit={submit} className="mt-8 space-y-4">
              {error && (
                <div
                  role="alert"
                  className="rounded-xl border px-3 py-2.5 text-sm"
                  style={{
                    background: "var(--color-danger-bg)",
                    borderColor: "rgba(185, 28, 28, 0.2)",
                    color: "var(--color-danger)",
                  }}
                >
                  {error}
                </div>
              )}

              <FormField
                label="Email address"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="you@hospital.com"
                autoComplete="email"
                required
              />
              <FormField
                label="Password"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />

              <button
                type="submit"
                disabled={submitting || !email || !password}
                className="btn-ink w-full mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Signing in..." : "Sign in"}
                {!submitting && (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M2 7h10M8 3l4 4-4 4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            </form>

            {/* Demo accounts */}
            <div className="mt-10 surface p-5">
              <div className="eyebrow mb-3">Demo accounts</div>
              <ul className="space-y-2 text-xs">
                <DemoRow role="Admin" email="admin@medcred.com" pw="admin123" />
                <DemoRow
                  role="Facility"
                  email="hospital@medcred.com"
                  pw="client123"
                />
                <DemoRow
                  role="Employee"
                  email="employee@medcred.com"
                  pw="employee123"
                />
                <DemoRow
                  role="Pending"
                  email="pending@medcred.com"
                  pw="employee123"
                />
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function FormField({
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
  required,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium tracking-wider uppercase text-muted mb-1.5">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        className="w-full rounded-xl border bg-card px-4 py-3 text-sm text-ink shadow-sm transition focus:outline-none focus:ring-2 focus:ring-offset-1"
        style={{ borderColor: "var(--color-line)" }}
      />
    </label>
  );
}

function DemoRow({
  role,
  email,
  pw,
}: {
  role: string;
  email: string;
  pw: string;
}) {
  return (
    <li className="flex items-center justify-between gap-3 mono">
      <span className="text-muted shrink-0 w-16">{role}</span>
      <span className="text-ink truncate">{email}</span>
      <span className="text-mute2 text-[10px]">{pw}</span>
    </li>
  );
}

function Logomark({ inverted = false }: { inverted?: boolean }) {
  const ink = inverted ? "white" : "#0b1220";
  const accent = "#047857";
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="2" y="11" width="3" height="9" rx="1" fill={ink} />
      <rect x="7" y="6" width="3" height="14" rx="1" fill={ink} />
      <rect x="12" y="2" width="3" height="18" rx="1" fill={ink} />
      <circle cx="18" cy="4" r="2" fill={accent} />
    </svg>
  );
}
