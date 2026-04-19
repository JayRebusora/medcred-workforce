// src/app/(app)/dashboard/page.tsx
// Placeholder dashboard page. Right now it just proves auth works —
// reads the session, greets the user, shows their role, offers sign-out.
// We'll replace this with real per-role content later.

import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";

export default async function DashboardPage() {
  const session = await auth();

  // Middleware should have caught this already, but belt-and-suspenders
  if (!session?.user) redirect("/login");

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">
                Welcome, {session.user.name}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                You&rsquo;re signed in as{" "}
                <span className="font-mono text-slate-700">
                  {session.user.email}
                </span>
              </p>
              <div className="mt-3 inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                Role: {session.user.role}
              </div>
            </div>

            <form action={handleSignOut}>
              <button
                type="submit"
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Sign out
              </button>
            </form>
          </div>

          <hr className="my-6 border-slate-200" />

          <div className="rounded-md bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-medium text-slate-700">
              🚧 Dashboard under construction
            </p>
            <p className="mt-1">
              This page will show role-specific content once the portals are
              built. For now, it confirms that auth is working end-to-end.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
