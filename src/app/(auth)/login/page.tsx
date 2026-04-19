// src/app/(auth)/login/page.tsx
// Redesigned login: split-screen. Left panel is editorial (lattice + pull-quote),
// right panel is the functional form. Same server-action sign-in as before.

import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn, auth } from "@/auth";
import { Lockup } from "@/components/brand/Lockup";
import { CredentialLattice } from "@/components/brand/CredentialLattice";

type PageProps = {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
};

function getErrorMessage(code: string | undefined): string | null {
  if (!code) return null;
  switch (code) {
    case "CredentialsSignin":
      return "Invalid email or password.";
    case "AccessDenied":
      return "You don't have access to this resource.";
    default:
      return "Something went wrong. Please try again.";
  }
}

export default async function LoginPage({ searchParams }: PageProps) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const params = await searchParams;
  const errorMessage = getErrorMessage(params.error);
  const callbackUrl = params.callbackUrl ?? "/dashboard";

  async function handleLogin(formData: FormData) {
    "use server";
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      await signIn("credentials", { email, password, redirectTo: callbackUrl });
    } catch (err) {
      if (err instanceof AuthError) {
        redirect(`/login?error=${err.type}`);
      }
      throw err;
    }
  }

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left panel — editorial */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-slate-50 px-12 py-10 lg:flex lg:w-[44%]">
        <div className="relative z-10">
          <Lockup size="md" />
        </div>

        {/* Lattice sits behind, fading into the page */}
        <div className="absolute inset-x-0 top-24 flex justify-center opacity-80">
          <CredentialLattice className="w-[520px] max-w-full" />
        </div>
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-50/70 to-slate-50"
        />

        <div className="relative z-10 max-w-sm">
          <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
            From the field
          </p>
          <blockquote
            className="text-2xl leading-snug text-slate-800"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            &ldquo;If a certification expires at 11:59 PM, the system should
            know by 12:00 AM. Paper clipboards don&rsquo;t have that property.
            Software does.&rdquo;
          </blockquote>
          <p className="mt-4 text-xs text-slate-500">
            &mdash; The design brief behind MedCred Workforce
          </p>
        </div>
      </aside>

      {/* Right panel — form */}
      <main className="flex w-full flex-col justify-between p-6 lg:w-[56%] lg:px-16 lg:py-10">
        {/* Mobile lockup (desktop shows it in the left panel) */}
        <div className="flex items-center justify-between lg:hidden">
          <Lockup size="sm" />
          <Link
            href="/"
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            &larr; Home
          </Link>
        </div>

        {/* Desktop: top-right "back to home" */}
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
            Sign in
          </p>
          <h1
            className="text-4xl leading-tight text-slate-900"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Welcome back.
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            Enter your credentials to access your portal.
          </p>

          {errorMessage && (
            <div
              role="alert"
              className="mt-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {errorMessage}
            </div>
          )}

          <form action={handleLogin} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-600"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

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
                autoComplete="current-password"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <button
              type="submit"
              className="mt-2 w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
            >
              Sign in
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-slate-500">
            Don&rsquo;t have an account?{" "}
            <Link
              href="/apply"
              className="font-medium text-slate-700 hover:underline"
            >
              Apply to join
            </Link>
          </p>
        </div>

        {/* Footer meta */}
        <div className="mt-auto flex items-center justify-between border-t border-slate-200 pt-6 text-xs text-slate-500">
          <span className="font-mono uppercase tracking-wider">
            Secure · TLS · JWT-signed session
          </span>
          <span className="font-mono uppercase tracking-wider">
            &copy; {new Date().getFullYear()}
          </span>
        </div>
      </main>
    </div>
  );
}
