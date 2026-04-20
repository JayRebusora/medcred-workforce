// src/app/(app)/shifts/[id]/page.tsx
// Minimal shift detail page. Shows the shift's data and current assignments.
//
// NOTE (issue #3): This is intentionally a stub. Issue #3 will add:
//   - Eligibility engine results
//   - Eligible employees list with credential-check outcomes
//   - "Propose assignment" action capturing a credentialCheckSnapshot
//   - Per-assignment accept/decline state
// Don't delete or rewrite from scratch when you get to #3 — expand this file.

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ShiftDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;

  const shift = await prisma.shift.findFirst({
    where: { id, deletedAt: null },
    include: {
      facility: true,
      assignments: {
        include: {
          employee: { include: { user: true } },
        },
      },
    },
  });

  if (!shift) {
    return (
      <div className="p-6">
        <p className="text-sm text-slate-600">Shift not found.</p>
        <Link
          href="/shifts"
          className="mt-4 inline-block text-sm font-medium text-slate-700 hover:underline"
        >
          &larr; Back to shifts
        </Link>
      </div>
    );
  }

  // Access control: admins see any, facilities see only their own,
  // employees see only shifts they're assigned to.
  const role = session.user.role;
  if (role === "CLIENT") {
    const facility = await prisma.facility.findUnique({
      where: { userId: session.user.id },
    });
    if (!facility || shift.facilityId !== facility.id) {
      redirect("/dashboard");
    }
  } else if (role === "EMPLOYEE") {
    const employee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
    });
    const assigned = employee
      ? shift.assignments.some((a) => a.employeeId === employee.id)
      : false;
    if (!assigned) redirect("/dashboard");
  }

  return (
    <div className="p-6">
      <Link
        href="/shifts"
        className="mb-4 inline-block text-sm text-slate-600 hover:text-slate-900"
      >
        &larr; Back to shifts
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {shift.title}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {shift.facility.name} &middot;{" "}
            {shift.startAt.toLocaleString([], {
              dateStyle: "medium",
              timeStyle: "short",
            })}{" "}
            &mdash;{" "}
            {shift.endAt.toLocaleString([], {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        </div>
        <StatusBadge status={shift.status} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {shift.description && (
            <Card title="Description">
              <p className="px-4 py-3 text-sm text-slate-700">
                {shift.description}
              </p>
            </Card>
          )}

          <Card title="Requirements">
            <Row k="Allowed employee types">
              <div className="flex flex-wrap gap-1.5">
                {shift.allowedEmployeeTypes.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-slate-700"
                  >
                    {t.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            </Row>
            <Row k="Extra required credentials">
              {shift.extraRequiredCredentials.length === 0 ? (
                <span className="text-xs text-slate-500">
                  None (baseline only)
                </span>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {shift.extraRequiredCredentials.map((c) => (
                    <span
                      key={c}
                      className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-slate-700"
                    >
                      {c.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              )}
            </Row>
            {shift.hourlyRate !== null && (
              <Row k="Hourly rate">
                <span className="font-mono text-sm text-slate-900">
                  ${shift.hourlyRate.toString()}
                </span>
              </Row>
            )}
          </Card>

          <Card title={`Assignments (${shift.assignments.length})`}>
            {shift.assignments.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">
                No assignments yet.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-2 font-medium">Employee</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium">Cred check</th>
                  </tr>
                </thead>
                <tbody>
                  {shift.assignments.map((a) => (
                    <tr
                      key={a.id}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="px-4 py-2.5 text-slate-900">
                        {a.employee.user.firstName} {a.employee.user.lastName}
                      </td>
                      <td className="px-4 py-2.5 text-slate-700">{a.status}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            a.credentialCheckPassed
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {a.credentialCheckPassed ? "PASSED" : "FAILED"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>

        <div>
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Assignment engine
            </p>
            <p className="mt-2 text-sm text-slate-600">
              The credential-aware assignment UI ships in the next issue (#3).
              For now, use the Shifts list to see eligibility at a glance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const classes =
    status === "OPEN"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : status === "ASSIGNED"
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : status === "IN_PROGRESS"
          ? "bg-blue-50 text-blue-700 border-blue-200"
          : status === "COMPLETED"
            ? "bg-slate-100 text-slate-700 border-slate-200"
            : "bg-red-50 text-red-700 border-red-200";
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-medium ${classes}`}
    >
      {status}
    </span>
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
      <div className="divide-y divide-slate-100">{children}</div>
    </div>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <dt className="text-xs text-slate-500">{k}</dt>
      <dd className="ml-4">{children}</dd>
    </div>
  );
}
