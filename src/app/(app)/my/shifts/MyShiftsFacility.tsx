// Facility's view of their own shifts. Three sections:
//   1. Open          — requested, no employee assigned yet
//   2. Upcoming      — ASSIGNED or IN_PROGRESS, not yet past
//   3. History       — COMPLETED + CANCELLED
//
// Plus a "+ Request new shift" button top-right.

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ShiftStatus } from "@prisma/client";

export async function MyShiftsFacility({
  userId,
  flash,
}: {
  userId: string;
  flash?: string;
}) {
  const facility = await prisma.facility.findUnique({
    where: { userId },
  });
  if (!facility) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          No facility profile found for your account. Contact an administrator.
        </div>
      </div>
    );
  }

  const now = new Date();

  const [openShifts, upcoming, history] = await Promise.all([
    prisma.shift.findMany({
      where: {
        facilityId: facility.id,
        status: ShiftStatus.OPEN,
        deletedAt: null,
      },
      orderBy: { startAt: "asc" },
    }),
    prisma.shift.findMany({
      where: {
        facilityId: facility.id,
        status: { in: [ShiftStatus.ASSIGNED, ShiftStatus.IN_PROGRESS] },
        startAt: { gte: now },
        deletedAt: null,
      },
      include: {
        assignments: {
          where: { status: { in: ["PROPOSED", "CONFIRMED"] } },
          include: { employee: { include: { user: true } } },
          take: 1,
        },
      },
      orderBy: { startAt: "asc" },
    }),
    prisma.shift.findMany({
      where: {
        facilityId: facility.id,
        OR: [
          { status: ShiftStatus.COMPLETED },
          { status: ShiftStatus.CANCELLED },
          { status: ShiftStatus.ASSIGNED, startAt: { lt: now } },
        ],
        deletedAt: null,
      },
      include: {
        assignments: {
          include: { employee: { include: { user: true } } },
          take: 1,
        },
      },
      orderBy: { startAt: "desc" },
      take: 20,
    }),
  ]);

  const flashMessage =
    flash === "requested"
      ? {
          kind: "success" as const,
          message: "Shift requested. It's now open for assignment.",
        }
      : null;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            My Shifts
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Request new shift coverage and review your existing shifts.
          </p>
        </div>
        <Link
          href="/my/shifts/new"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
        >
          + Request new shift
        </Link>
      </div>

      {flashMessage && (
        <div
          role="alert"
          className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          {flashMessage.message}
        </div>
      )}

      <Section
        title={`Open (${openShifts.length})`}
        subtitle="Requested but not yet staffed."
      >
        {openShifts.length === 0 ? (
          <EmptyRow>No open shift requests.</EmptyRow>
        ) : (
          <ul className="divide-y divide-slate-100">
            {openShifts.map((s) => (
              <ShiftRow
                key={s.id}
                title={s.title}
                subtitle={`${s.startAt.toLocaleString([], { dateStyle: "medium", timeStyle: "short" })} — ${s.endAt.toLocaleString([], { timeStyle: "short" })}`}
                badge={{ label: "OPEN", tone: "warning" }}
                assigned="Awaiting assignment"
                shiftId={s.id}
              />
            ))}
          </ul>
        )}
      </Section>

      <Section
        title={`Upcoming (${upcoming.length})`}
        subtitle="Assigned shifts that haven't started."
      >
        {upcoming.length === 0 ? (
          <EmptyRow>No upcoming assigned shifts.</EmptyRow>
        ) : (
          <ul className="divide-y divide-slate-100">
            {upcoming.map((s) => {
              const assignment = s.assignments[0];
              const assignedName = assignment
                ? `${assignment.employee.user.firstName} ${assignment.employee.user.lastName}`
                : "—";
              return (
                <ShiftRow
                  key={s.id}
                  title={s.title}
                  subtitle={`${s.startAt.toLocaleString([], { dateStyle: "medium", timeStyle: "short" })} — ${s.endAt.toLocaleString([], { timeStyle: "short" })}`}
                  badge={{
                    label: s.status,
                    tone: s.status === "ASSIGNED" ? "success" : "neutral",
                  }}
                  assigned={assignedName}
                  shiftId={s.id}
                />
              );
            })}
          </ul>
        )}
      </Section>

      <Section
        title={`History (${history.length})`}
        subtitle="Completed or cancelled shifts."
      >
        {history.length === 0 ? (
          <EmptyRow>No historical shifts.</EmptyRow>
        ) : (
          <ul className="divide-y divide-slate-100">
            {history.map((s) => {
              const assignment = s.assignments[0];
              const assignedName = assignment
                ? `${assignment.employee.user.firstName} ${assignment.employee.user.lastName}`
                : "—";
              return (
                <ShiftRow
                  key={s.id}
                  title={s.title}
                  subtitle={s.startAt.toLocaleDateString()}
                  badge={{
                    label: s.status,
                    tone:
                      s.status === "COMPLETED"
                        ? "success"
                        : s.status === "CANCELLED"
                          ? "danger"
                          : "neutral",
                  }}
                  assigned={assignedName}
                  shiftId={s.id}
                />
              );
            })}
          </ul>
        )}
      </Section>
    </div>
  );
}

// ─── UI primitives ─────────────────────────────────────────────────

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-5 py-3">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {subtitle && (
          <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-5 py-8 text-center text-sm text-slate-500">{children}</p>
  );
}

function ShiftRow({
  title,
  subtitle,
  assigned,
  badge,
  shiftId,
}: {
  title: string;
  subtitle: string;
  assigned: string;
  badge: { label: string; tone: "success" | "warning" | "danger" | "neutral" };
  shiftId: string;
}) {
  const toneClass = {
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    danger: "bg-red-50 text-red-700",
    neutral: "bg-slate-100 text-slate-700",
  }[badge.tone];

  return (
    <li className="px-5 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link
            href={`/shifts/${shiftId}`}
            className="text-sm font-medium text-slate-900 hover:underline"
          >
            {title}
          </Link>
          <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
          <p className="mt-0.5 text-xs text-slate-600">
            <span className="text-slate-400">Assigned:</span> {assigned}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${toneClass}`}
        >
          {badge.label}
        </span>
      </div>
    </li>
  );
}
