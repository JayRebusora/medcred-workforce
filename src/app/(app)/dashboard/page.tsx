//This page is a Server-side role router. It will Reads the session, dispatches to the correct
// dashboard component. Each dashboard is a Server Component that does its
// own Prisma queries.

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { EmployeeDashboard } from "@/components/dashboard/EmployeeDashboard";
import { ClientDashboard } from "@/components/dashboard/ClientDashboard";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  switch (session.user.role) {
    case "ADMIN":
      return <AdminDashboard />;
    case "EMPLOYEE":
      return <EmployeeDashboard userId={session.user.id} />;
    case "CLIENT":
      return <ClientDashboard userId={session.user.id} />;
    default:
      redirect("/login");
  }
}
