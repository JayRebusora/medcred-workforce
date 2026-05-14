// src/app/(app)/facilities/[id]/page.tsx
// Admin view of a single facility. Shows facility profile and all shifts
// they've posted, grouped by status.

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ShiftStatus } from "@prisma/client";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function FacilityDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard");

  const { id } = await params;

  const facility = await prisma.facility.findFirst({
    where: { id, deletedAt: null },
    include: {
      user: true,
      shifts: {
        include: {
          assignments: {
            include: {
              employee: {
                include: {
                  user: { select: { firstName: true, lastName: true } },
                },
              },
            },
          },
        },
        orderBy: { startAt: "desc" },
      },
    },
  });

  if (!facility) {
    return (
      <div className="p-6">
        <p className="text-sm text-slate-600">Facility not found.</p>
        <Link
          href="/facilities"
          className="mt-4 inline-block text-sm font-medium text-slate-700 hover:underline"
        >
          ← Back to facilities
        </Link>
      </div>
    );
  }

  // Group shifts by status
  const shiftsByStatus = {
    OPEN: facility.shifts.filter((s) => s.status === ShiftStatus.OPEN),
    ASSIGNED: facility.shifts.filter((s) => s.status === ShiftStatus.ASSIGNED),
    COMPLETED: facility.shifts.filter(
      (s) => s.status === ShiftStatus.COMPLETED,
    ),
    CANCELLED: facility.shifts.filter(
      (s) => s.status === ShiftStatus.CANCELLED,
    ),
  };

  return (
    <div className="p-6">
      <Link
        href="/facilities"
        className="mb-4 inline-block text-sm text-slate-600 hover:text-slate-900"
      >
        ← Back to facilities
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          {facility.name}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {facility.facilityType ?? "Healthcare facility"} · Joined{" "}
          {facility.user.createdAt.toLocaleDateString()}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column — profile */}
        <div className="space-y-5">
          <Card title="Profile">
            <Row k="Type">{facility.facilityType ?? "—"}</Row>
            <Row k="Contact email">{facility.user.email}</Row>
            <Row k="Phone">{facility.user.phoneNumber ?? "—"}</Row>
          </Card>

          <Card title="Address">
            <div className="px-4 py-3 text-sm text-slate-700 leading-relaxed">
              {facility.addressLine1 ? (
                <>
                  <div>{facility.addressLine1}</div>
                  {facility.addressLine2 && <div>{facility.addressLine2}</div>}
                  <div>
                    {[facility.city, facility.state, facility.zipCode]
                      .filter(Boolean)
                      .join(", ")}
                  </div>
                </>
              ) : (
                <span className="text-slate-500">No address on file</span>
              )}
            </div>
          </Card>

          <Card title="Activity">
            <Row k="Total shifts">{facility.shifts.length}</Row>
            <Row k="Open">{shiftsByStatus.OPEN.length}</Row>
            <Row k="Assigned">{shiftsByStatus.ASSIGNED.length}</Row>
            <Row k="Completed">{shiftsByStatus.COMPLETED.length}</Row>
          </Card>
        </div>

        {/* Right columns — shifts */}
        <div className="lg:col-span-2 space-y-5">
          {(["OPEN", "ASSIGNED", "COMPLETED"] as const).map((status) => {
            const shifts = shiftsByStatus[status];
            if (shifts.length === 0) return null;
            return (
              <Card
                key={status}
                title={`${status.charAt(0)}${status.slice(1).toLowerCase()} shifts (${shifts.length})`}
              >
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wider text-slate-500">
                      <th className="px-4 py-2 font-medium">Title</th>
                      <th className="px-4 py-2 font-medium">When</th>
                      <th className="px-4 py-2 font-medium">Assigned to</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shifts.map((s) => {
                      const confirmed = s.assignments.find(
                        (a) =>
                          a.status === "CONFIRMED" || a.status === "COMPLETED",
                      );
                      return (
                        <tr
                          key={s.id}
                          className="border-b border-slate-50 last:border-0"
                        >
                          <td className="px-4 py-2 text-slate-900">
                            {s.title}
                          </td>
                          <td className="px-4 py-2 text-slate-600">
                            {s.startAt.toLocaleDateString()}
                          </td>
                          <td className="px-4 py-2 text-slate-600">
                            {confirmed
                              ? `${confirmed.employee.user.firstName} ${confirmed.employee.user.lastName}`
                              : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>
            );
          })}

          {facility.shifts.length === 0 && (
            <Card title="Shifts">
              <p className="px-4 py-3 text-sm text-slate-500">
                This facility hasn't posted any shifts yet.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-2.5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
          {title}
        </h3>
      </div>
      <div>{children}</div>
    </div>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-50 last:border-0">
      <dt className="text-xs text-slate-500">{k}</dt>
      <dd className="text-sm text-slate-900 text-right">{children}</dd>
    </div>
  );
}
