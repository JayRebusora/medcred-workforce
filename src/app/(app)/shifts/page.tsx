// Admin-only shifts list. Status filter tabs, server-side pagination
// (20 per page), sort by start time ascending by default.

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ShiftStatus } from "@prisma/client";

const PAGE_SIZE = 20;
const STATUSES: ShiftStatus[] = [
  "OPEN",
  "ASSIGNED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];

type Props = {
  searchParams: Promise<{ status?: string; page?: string }>;
};

export default async function ShiftsListPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard");

  const params = await searchParams;
  const activeStatus: ShiftStatus = (STATUSES as string[]).includes(
    params.status ?? "",
  )
    ? (params.status as ShiftStatus)
    : "OPEN";
  const pageNum = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const skip = (pageNum - 1) * PAGE_SIZE;

  // Run counts + rows in parallel
  const [counts, shifts, totalForStatus] = await Promise.all([
    Promise.all(
      STATUSES.map(async (s) => ({
        status: s,
        count: await prisma.shift.count({
          where: { status: s, deletedAt: null },
        }),
      })),
    ),
    prisma.shift.findMany({
      where: { status: activeStatus, deletedAt: null },
      include: {
        facility: { select: { name: true } },
        assignments: {
          where: { status: { in: ["PROPOSED", "CONFIRMED"] } },
          include: {
            employee: {
              include: {
                user: { select: { firstName: true, lastName: true } },
              },
            },
          },
          take: 1, // Most shifts have one active assignment at most for display purposes
        },
      },
      orderBy: { startAt: "asc" },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.shift.count({ where: { status: activeStatus, deletedAt: null } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalForStatus / PAGE_SIZE));

  return (
    <div className="p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Shifts
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            All shifts across facilities. Filter by status; click a row to
            review details.
          </p>
        </div>
        <Link
          href="/shifts/new"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
        >
          + New shift
        </Link>
      </div>

      {/* Status tabs */}
      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-slate-200">
        {counts.map(({ status, count }) => (
          <Link
            key={status}
            href={`/shifts?status=${status}`}
            className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition ${
              activeStatus === status
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {labelize(status)}
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                activeStatus === status
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {count}
            </span>
          </Link>
        ))}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        {shifts.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-slate-500">
            No shifts with status {labelize(activeStatus).toLowerCase()}.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-5 py-2.5 font-medium">Title</th>
                <th className="px-5 py-2.5 font-medium">Facility</th>
                <th className="px-5 py-2.5 font-medium">Start</th>
                <th className="px-5 py-2.5 font-medium">Duration</th>
                <th className="px-5 py-2.5 font-medium">Allowed types</th>
                <th className="px-5 py-2.5 font-medium">Assigned</th>
                <th className="px-5 py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {shifts.map((shift) => {
                const assignment = shift.assignments[0];
                const durationMs =
                  shift.endAt.getTime() - shift.startAt.getTime();
                return (
                  <tr
                    key={shift.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                  >
                    <td className="px-5 py-3 font-medium text-slate-900">
                      {shift.title}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {shift.facility.name}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {shift.startAt.toLocaleString([], {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-600">
                      {formatDuration(durationMs)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {shift.allowedEmployeeTypes.slice(0, 2).map((t) => (
                          <span
                            key={t}
                            className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-700"
                          >
                            {t.replace(/_/g, " ")}
                          </span>
                        ))}
                        {shift.allowedEmployeeTypes.length > 2 && (
                          <span className="text-[10px] text-slate-500">
                            +{shift.allowedEmployeeTypes.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-700">
                      {assignment
                        ? `${assignment.employee.user.firstName} ${assignment.employee.user.lastName}`
                        : "—"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/shifts/${shift.id}`}
                        className="text-sm font-medium text-slate-700 hover:text-slate-900 hover:underline"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <p className="text-slate-500">
            Page {pageNum} of {totalPages} &middot; {totalForStatus} total
          </p>
          <div className="flex gap-2">
            <PageLink
              activeStatus={activeStatus}
              page={pageNum - 1}
              disabled={pageNum <= 1}
              label="← Prev"
            />
            <PageLink
              activeStatus={activeStatus}
              page={pageNum + 1}
              disabled={pageNum >= totalPages}
              label="Next →"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────

function labelize(status: ShiftStatus): string {
  // "IN_PROGRESS" → "In progress"
  return status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, " ");
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.round(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function PageLink({
  activeStatus,
  page,
  disabled,
  label,
}: {
  activeStatus: ShiftStatus;
  page: number;
  disabled: boolean;
  label: string;
}) {
  const cls =
    "rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50";
  if (disabled) {
    return (
      <span className={`${cls} cursor-not-allowed opacity-40`}>{label}</span>
    );
  }
  return (
    <Link href={`/shifts?status=${activeStatus}&page=${page}`} className={cls}>
      {label}
    </Link>
  );
}
