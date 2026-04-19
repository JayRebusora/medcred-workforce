// src/app/(auth)/login/page.tsx
// Simple email + password login. Uses a server action to call signIn(),
// which is NextAuth's server-side sign-in function. Shows inline errors.

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn, auth } from "@/auth";

type PageProps = {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
};

// Maps Auth.js error codes to user-friendly messages
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
  // If already logged in, skip login and go to dashboard
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
      await signIn("credentials", {
        email,
        password,
        redirectTo: callbackUrl,
      });
    } catch (err) {
      if (err instanceof AuthError) {
        // Re-throw with a URL param so the error renders inline
        redirect(`/login?error=${err.type}`);
      }
      // Next.js throws a NEXT_REDIRECT internally for signIn's redirect —
      // don't swallow it
      throw err;
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="mb-1 text-2xl font-semibold text-slate-900">
            Sign in to MedCred
          </h1>
          <p className="mb-6 text-sm text-slate-500">
            Enter your credentials to access your dashboard.
          </p>

          {errorMessage && (
            <div
              role="alert"
              className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {errorMessage}
            </div>
          )}

          <form action={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
            >
              Sign in
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-500">
            Don&rsquo;t have an account?{" "}
            <a
              href="/apply"
              className="font-medium text-slate-700 hover:underline"
            >
              Apply now
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
