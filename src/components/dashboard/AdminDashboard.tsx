// System-wide overview for admins: pending applications, pending credentials,
// open shifts, total employees/facilities, credentials expiring soon.

import { prisma } from "@/lib/prisma";
import { StatCard } from "./StatCard";

export async function AdminDashboard() {
  // Run queries in parallel — these are independent
  const [
    pendingApplications,
    pendingCredentials,
    expiringSoon,
    openShifts,
    activeEmployees,
    activeFacilities,
    recentApplications,
  ] = await Promise.all([
    prisma.application.count({ where: { status: "PENDING" } }),
    prisma.credential.count({
      where: { status: "PENDING", deletedAt: null },
    }),
    prisma.credential.count({
      where: {
        status: "APPROVED",
        deletedAt: null,
        expiryDate: {
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          gte: new Date(),
        },
      },
    }),
    prisma.shift.count({ where: { status: "OPEN", deletedAt: null } }),
    prisma.employee.count({ where: { deletedAt: null } }),
    prisma.facility.count({ where: { deletedAt: null } }),
    prisma.application.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Admin Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          System-wide overview of applications, credentials, and shifts.
        </p>
      </div>

      {/* Primary stats — things requiring admin attention */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Pending applications"
          value={pendingApplications}
          hint={pendingApplications > 0 ? "Needs review" : "All caught up"}
          tone={pendingApplications > 0 ? "warning" : "success"}
        />
        <StatCard
          label="Pending credentials"
          value={pendingCredentials}
          hint={pendingCredentials > 0 ? "Awaiting approval" : "All reviewed"}
          tone={pendingCredentials > 0 ? "warning" : "success"}
        />
        <StatCard
          label="Expiring soon"
          value={expiringSoon}
          hint="Within 30 days"
          tone={expiringSoon > 0 ? "danger" : "default"}
        />
        <StatCard label="Open shifts" value={openShifts} hint="Unassigned" />
      </div>

      {/* Secondary stats — system totals */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Active employees" value={activeEmployees} />
        <StatCard label="Active facilities" value={activeFacilities} />
      </div>

      {/* Recent applications table */}
      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-900">
            Recent applications
          </h2>
        </div>
        {recentApplications.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">
            No pending applications.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-5 py-2 font-medium">Name</th>
                <th className="px-5 py-2 font-medium">Email</th>
                <th className="px-5 py-2 font-medium">Applying as</th>
                <th className="px-5 py-2 font-medium">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {recentApplications.map((app) => (
                <tr
                  key={app.id}
                  className="border-b border-slate-100 last:border-0"
                >
                  <td className="px-5 py-3 text-slate-900">
                    {app.firstName} {app.lastName}
                  </td>
                  <td className="px-5 py-3 text-slate-600">{app.email}</td>
                  <td className="px-5 py-3 text-slate-600">
                    {app.roleType === "EMPLOYEE"
                      ? (app.employeeType?.replace(/_/g, " ") ?? "Employee")
                      : "Facility"}
                  </td>
                  <td className="px-5 py-3 text-slate-500">
                    {app.createdAt.toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
