// src/app/(app)/employees/[id]/page.tsx
// Admin view of a single employee. Shows the employee's profile, all
// their credentials, and their shift history.

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CredentialStatus, AssignmentStatus } from "@prisma/client";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EmployeeDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard");

  const { id } = await params;

  const employee = await prisma.employee.findFirst({
    where: { id, deletedAt: null },
    include: {
      user: true,
      credentials: {
        where: { deletedAt: null },
        orderBy: [{ type: "asc" }, { expiryDate: "desc" }],
      },
      assignments: {
        include: {
          shift: {
            include: {
              facility: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!employee) {
    return (
      <div className="p-6">
        <p className="text-sm text-slate-600">Employee not found.</p>
        <Link
          href="/employees"
          className="mt-4 inline-block text-sm font-medium text-slate-700 hover:underline"
        >
          ← Back to employees
        </Link>
      </div>
    );
  }

  const approvedCreds = employee.credentials.filter(
    (c) => c.status === CredentialStatus.APPROVED,
  );
  const pendingCreds = employee.credentials.filter(
    (c) => c.status === CredentialStatus.PENDING,
  );

  return (
    <div className="p-6">
      <Link
        href="/employees"
        className="mb-4 inline-block text-sm text-slate-600 hover:text-slate-900"
      >
        ← Back to employees
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          {employee.user.firstName} {employee.user.lastName}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {employee.employeeType.replace(/_/g, " ")} · Joined{" "}
          {employee.user.createdAt.toLocaleDateString()}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column — profile */}
        <div className="space-y-5">
          <Card title="Profile">
            <Row k="Email">{employee.user.email}</Row>
            <Row k="Phone">{employee.user.phoneNumber ?? "—"}</Row>
            <Row k="Experience">
              {employee.yearsExperience !== null &&
              employee.yearsExperience !== undefined
                ? `${employee.yearsExperience} years`
                : "—"}
            </Row>
            <Row k="Location">
              {employee.city && employee.state
                ? `${employee.city}, ${employee.state}`
                : "—"}
            </Row>
          </Card>

          <Card title="Summary">
            <Row k="Approved credentials">{approvedCreds.length}</Row>
            <Row k="Pending credentials">{pendingCreds.length}</Row>
            <Row k="Total assignments">{employee.assignments.length}</Row>
            <Row k="Completed shifts">
              {
                employee.assignments.filter(
                  (a) => a.status === AssignmentStatus.COMPLETED,
                ).length
              }
            </Row>
          </Card>
        </div>

        {/* Right columns — credentials and shifts */}
        <div className="lg:col-span-2 space-y-5">
          <Card title="Credentials">
            {employee.credentials.length === 0 ? (
              <p className="px-4 py-3 text-sm text-slate-500">
                No credentials on file.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-2 font-medium">Type</th>
                    <th className="px-4 py-2 font-medium">Number</th>
                    <th className="px-4 py-2 font-medium">Expires</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {employee.credentials.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-slate-50 last:border-0"
                    >
                      <td className="px-4 py-2 text-slate-900">
                        {c.type.replace(/_/g, " ")}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-slate-600">
                        {c.credentialNumber ?? "—"}
                      </td>
                      <td className="px-4 py-2 text-slate-600">
                        {c.expiryDate.toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2">
                        <CredStatusBadge status={c.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <Card title="Shift history">
            {employee.assignments.length === 0 ? (
              <p className="px-4 py-3 text-sm text-slate-500">
                No assignments yet.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-2 font-medium">Shift</th>
                    <th className="px-4 py-2 font-medium">Facility</th>
                    <th className="px-4 py-2 font-medium">When</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {employee.assignments.map((a) => (
                    <tr
                      key={a.id}
                      className="border-b border-slate-50 last:border-0"
                    >
                      <td className="px-4 py-2 text-slate-900">
                        {a.shift.title}
                      </td>
                      <td className="px-4 py-2 text-slate-600">
                        {a.shift.facility.name}
                      </td>
                      <td className="px-4 py-2 text-slate-600">
                        {a.shift.startAt.toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2">
                        <AssignmentStatusBadge status={a.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
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

function CredStatusBadge({ status }: { status: CredentialStatus }) {
  const map = {
    APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    PENDING: "bg-amber-50 text-amber-700 border-amber-200",
    REJECTED: "bg-red-50 text-red-700 border-red-200",
    EXPIRED: "bg-slate-100 text-slate-600 border-slate-200",
  } as const;
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-xs font-medium ${map[status]}`}
    >
      {status.toLowerCase()}
    </span>
  );
}

function AssignmentStatusBadge({ status }: { status: AssignmentStatus }) {
  const map = {
    PROPOSED: "bg-blue-50 text-blue-700 border-blue-200",
    CONFIRMED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    DECLINED: "bg-slate-100 text-slate-600 border-slate-200",
    COMPLETED: "bg-slate-100 text-slate-700 border-slate-200",
    CANCELLED: "bg-red-50 text-red-700 border-red-200",
  } as const;
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-xs font-medium ${map[status]}`}
    >
      {status.toLowerCase()}
    </span>
  );
}
