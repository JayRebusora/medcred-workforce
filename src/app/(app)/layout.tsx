// src/app/(app)/layout.tsx
// Shell for all authenticated pages. Protects the route group by asserting
// a session exists (middleware also enforces this, but belt-and-suspenders),
// then renders sidebar + topbar + content area.

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role={session.user.role} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          userName={session.user.name ?? session.user.email ?? ""}
          userEmail={session.user.email ?? ""}
          role={session.user.role}
        />
        <main className="min-w-0 flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
