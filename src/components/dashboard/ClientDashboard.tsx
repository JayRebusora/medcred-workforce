// Facility-side view: coverage, upcoming shifts, assigned staff.

import { prisma } from "@/lib/prisma";
import { StatCard } from "./StatCard";

export async function ClientDashboard({ userId }: { userId: string }) {
  // Find the facility linked to this user
  const facility = await prisma.facility.findUnique({
    where: { userId },
  });

  if (!facility) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          No facility profile found for your account. Please contact an
          administrator.
        </div>
      </div>
    );
  }

  const now = new Date();

  const [
    openShifts,
    upcomingAssigned,
    totalShifts,
    assignedStaff,
    upcomingShifts,
  ] = await Promise.all([
    prisma.shift.count({
      where: {
        facilityId: facility.id,
        status: "OPEN",
        deletedAt: null,
      },
    }),
    prisma.shift.count({
      where: {
        facilityId: facility.id,
        status: "ASSIGNED",
        deletedAt: null,
      },
    }),
    prisma.shift.count({
      where: { facilityId: facility.id, deletedAt: null },
    }),
    // Distinct employees currently assigned to any future shift at this facility
    prisma.shiftAssignment.findMany({
      where: {
        shift: {
          facilityId: facility.id,
          startAt: { gte: now },
          deletedAt: null,
        },
        status: { in: ["PROPOSED", "CONFIRMED"] },
      },
      distinct: ["employeeId"],
      select: { employeeId: true },
    }),
    // Full detail for the table below
    prisma.shift.findMany({
      where: {
        facilityId: facility.id,
        startAt: { gte: now },
        deletedAt: null,
      },
      include: {
        assignments: {
          include: {
            employee: { include: { user: true } },
          },
        },
      },
      orderBy: { startAt: "asc" },
      take: 8,
    }),
  ]);

  const coverageRate =
    openShifts + upcomingAssigned > 0
      ? Math.round((upcomingAssigned / (openShifts + upcomingAssigned)) * 100)
      : 100;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          {facility.name}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {facility.addressLine1}, {facility.city}, {facility.state}{" "}
          {facility.zipCode}
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Coverage rate"
          value={`${coverageRate}%`}
          hint="Upcoming shifts covered"
          tone={
            coverageRate >= 80
              ? "success"
              : coverageRate >= 50
                ? "warning"
                : "danger"
          }
        />
        <StatCard
          label="Open shifts"
          value={openShifts}
          hint="Awaiting assignment"
          tone={openShifts > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Upcoming assigned"
          value={upcomingAssigned}
          tone="success"
        />
        <StatCard
          label="Assigned staff"
          value={assignedStaff.length}
          hint="Distinct employees"
        />
      </div>

      {/* Upcoming shifts with coverage */}
      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-900">
            Upcoming shifts
          </h2>
        </div>
        {upcomingShifts.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">
            No upcoming shifts scheduled. Contact your coordinator to request
            coverage.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-5 py-2 font-medium">Shift</th>
                <th className="px-5 py-2 font-medium">Start</th>
                <th className="px-5 py-2 font-medium">Assigned</th>
                <th className="px-5 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {upcomingShifts.map((shift) => {
                const confirmed = shift.assignments.find(
                  (a) => a.status === "CONFIRMED",
                );
                return (
                  <tr
                    key={shift.id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-5 py-3 text-slate-900">{shift.title}</td>
                    <td className="px-5 py-3 text-slate-600">
                      {shift.startAt.toLocaleString([], {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-5 py-3 text-slate-700">
                      {confirmed
                        ? `${confirmed.employee.user.firstName} ${confirmed.employee.user.lastName}`
                        : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          shift.status === "OPEN"
                            ? "bg-amber-50 text-amber-700"
                            : shift.status === "ASSIGNED"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {shift.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
