// Personal view for employees: their upcoming shifts, credential statuses,
// and anything requiring their attention.

import { prisma } from "@/lib/prisma";
import { StatCard } from "./StatCard";

export async function EmployeeDashboard({ userId }: { userId: string }) {
  // Find the Employee record linked to this user
  const employee = await prisma.employee.findUnique({
    where: { userId },
    include: {
      credentials: {
        where: { deletedAt: null },
        orderBy: { expiryDate: "asc" },
      },
    },
  });

  if (!employee) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          No employee profile found for your account. Please contact an
          administrator.
        </div>
      </div>
    );
  }

  const now = new Date();
  const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const approvedCount = employee.credentials.filter(
    (c) => c.status === "APPROVED",
  ).length;
  const pendingCount = employee.credentials.filter(
    (c) => c.status === "PENDING",
  ).length;
  const expiringSoon = employee.credentials.filter(
    (c) =>
      c.status === "APPROVED" &&
      c.expiryDate > now &&
      c.expiryDate <= thirtyDaysOut,
  );

  // Upcoming shifts — confirmed or proposed, starting in the future
  const upcomingShifts = await prisma.shiftAssignment.findMany({
    where: {
      employeeId: employee.id,
      status: { in: ["PROPOSED", "CONFIRMED"] },
      shift: { startAt: { gte: now } },
    },
    include: {
      shift: { include: { facility: true } },
    },
    orderBy: { shift: { startAt: "asc" } },
    take: 5,
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          My Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Your shifts, credentials, and alerts in one place.
        </p>
      </div>

      {/* Personal stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Approved credentials"
          value={approvedCount}
          tone="success"
        />
        <StatCard
          label="Pending credentials"
          value={pendingCount}
          hint={pendingCount > 0 ? "Awaiting admin review" : undefined}
          tone={pendingCount > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Expiring soon"
          value={expiringSoon.length}
          hint="Within 30 days"
          tone={expiringSoon.length > 0 ? "danger" : "default"}
        />
        <StatCard label="Upcoming shifts" value={upcomingShifts.length} />
      </div>

      {/* Upcoming shifts */}
      <div className="mb-6 rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-900">
            Upcoming shifts
          </h2>
        </div>
        {upcomingShifts.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">
            No upcoming shifts.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {upcomingShifts.map((assignment) => (
              <li key={assignment.id} className="px-5 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {assignment.shift.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      {assignment.shift.facility.name} ·{" "}
                      {assignment.shift.startAt.toLocaleString([], {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      assignment.status === "CONFIRMED"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {assignment.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Credential list */}
      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-900">
            My credentials
          </h2>
        </div>
        {employee.credentials.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">
            No credentials on file.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-5 py-2 font-medium">Type</th>
                <th className="px-5 py-2 font-medium">Number</th>
                <th className="px-5 py-2 font-medium">Expires</th>
                <th className="px-5 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {employee.credentials.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-slate-100 last:border-0"
                >
                  <td className="px-5 py-3 text-slate-900">
                    {c.type.replace(/_/g, " ")}
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-600">
                    {c.credentialNumber ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {c.expiryDate.toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        c.status === "APPROVED"
                          ? "bg-emerald-50 text-emerald-700"
                          : c.status === "PENDING"
                            ? "bg-amber-50 text-amber-700"
                            : c.status === "REJECTED"
                              ? "bg-red-50 text-red-700"
                              : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {c.status}
                    </span>
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
