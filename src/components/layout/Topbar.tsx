// src/components/layout/Topbar.tsx
// Top bar — page title slot (children) on the left, user info + sign-out on the right.

import { signOut } from "@/auth";
import { Role } from "@prisma/client";

type Props = {
  userName: string;
  userEmail: string;
  role: Role;
};

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrator",
  EMPLOYEE: "Employee",
  CLIENT: "Facility",
};

export function Topbar({ userName, userEmail, role }: Props) {
  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div /> {/* Left slot reserved for breadcrumbs later */}
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium leading-tight text-slate-900">
            {userName}
          </p>
          <p className="text-xs leading-tight text-slate-500">
            {ROLE_LABELS[role]} · {userEmail}
          </p>
        </div>

        <form action={handleSignOut}>
          <button
            type="submit"
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
