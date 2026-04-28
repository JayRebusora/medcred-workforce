// Employee's personal shifts view. Three sections:
//   1. Needs response — PROPOSED assignments awaiting Confirm/Decline
//   2. Upcoming       — CONFIRMED assignments that haven't started
//   3. History        — past + DECLINED + NO_SHOW

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AssignmentStatus } from "@prisma/client";

export async function MyShiftsEmployee({
  userId,
  flash,
}: {
  userId: string;
  flash?: string;
}) {
  const employee = await prisma.employee.findUnique({
    where: { userId },
  });
  if (!employee) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          No employee profile found for your account. Contact an administrator.
        </div>
      </div>
    );
  }

  const now = new Date();

  const [pending, upcoming, history] = await Promise.all([
    prisma.shiftAssignment.findMany({
      where: { employeeId: employee.id, status: AssignmentStatus.PROPOSED },
      include: { shift: { include: { facility: true } } },
      orderBy: { shift: { startAt: "asc" } },
    }),
    prisma.shiftAssignment.findMany({
      where: {
        employeeId: employee.id,
        status: AssignmentStatus.CONFIRMED,
        shift: { startAt: { gte: now } },
      },
      include: { shift: { include: { facility: true } } },
      orderBy: { shift: { startAt: "asc" } },
    }),
    prisma.shiftAssignment.findMany({
      where: {
        employeeId: employee.id,
        OR: [
          { status: AssignmentStatus.COMPLETED },
          { status: AssignmentStatus.DECLINED },
          { status: AssignmentStatus.NO_SHOW },
          {
            status: AssignmentStatus.CONFIRMED,
            shift: { startAt: { lt: now } },
          },
        ],
      },
      include: { shift: { include: { facility: true } } },
      orderBy: { shift: { startAt: "desc" } },
      take: 20,
    }),
  ]);

  // ─── Server actions ────────────────────────────────────────────────

  async function confirm(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    await callPatch(id, { action: "CONFIRM" });
    revalidatePath("/my/shifts");
    revalidatePath("/dashboard");
    redirect("/my/shifts?flash=confirmed");
  }

  async function decline(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    const note = (formData.get("note") as string | null)?.trim() || undefined;
    await callPatch(id, { action: "DECLINE", note });
    revalidatePath("/my/shifts");
    revalidatePath("/dashboard");
    redirect("/my/shifts?flash=declined");
  }

  const flashMessage =
    flash === "confirmed"
      ? {
          kind: "success" as const,
          message: "Shift confirmed. It's on your schedule.",
        }
      : flash === "declined"
        ? {
            kind: "info" as const,
            message: "Shift declined. The facility has been notified.",
          }
        : null;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          My Shifts
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Respond to new shift proposals and review your schedule.
        </p>
      </div>

      {flashMessage && (
        <div
          role="alert"
          className={`mb-5 rounded-md border px-4 py-3 text-sm ${
            flashMessage.kind === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-slate-200 bg-slate-50 text-slate-700"
          }`}
        >
          {flashMessage.message}
        </div>
      )}

      <Section
        title={`Needs response (${pending.length})`}
        subtitle="New shift proposals awaiting your confirmation."
      >
        {pending.length === 0 ? (
          <EmptyRow>No pending shift proposals.</EmptyRow>
        ) : (
          <ul className="divide-y divide-slate-100">
            {pending.map((a) => (
              <PendingRow
                key={a.id}
                a={a}
                confirm={confirm}
                decline={decline}
              />
            ))}
          </ul>
        )}
      </Section>

      <Section
        title={`Upcoming (${upcoming.length})`}
        subtitle="Shifts you've confirmed and haven't worked yet."
      >
        {upcoming.length === 0 ? (
          <EmptyRow>No upcoming confirmed shifts.</EmptyRow>
        ) : (
          <ul className="divide-y divide-slate-100">
            {upcoming.map((a) => (
              <SimpleRow
                key={a.id}
                title={a.shift.title}
                subtitle={`${a.shift.facility.name} · ${a.shift.startAt.toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}`}
                badge={{ label: "CONFIRMED", tone: "success" }}
              />
            ))}
          </ul>
        )}
      </Section>

      <Section
        title={`History (${history.length})`}
        subtitle="Previously worked, declined, or past shifts."
      >
        {history.length === 0 ? (
          <EmptyRow>No history yet.</EmptyRow>
        ) : (
          <ul className="divide-y divide-slate-100">
            {history.map((a) => (
              <SimpleRow
                key={a.id}
                title={a.shift.title}
                subtitle={`${a.shift.facility.name} · ${a.shift.startAt.toLocaleDateString()}`}
                badge={{
                  label: a.status,
                  tone:
                    a.status === "COMPLETED"
                      ? "success"
                      : a.status === "DECLINED"
                        ? "warning"
                        : a.status === "NO_SHOW"
                          ? "danger"
                          : "neutral",
                }}
                note={
                  a.status === "DECLINED" && a.note
                    ? `Reason: ${a.note}`
                    : undefined
                }
              />
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────

async function callPatch(
  id: string,
  body: { action: "CONFIRM" } | { action: "DECLINE"; note?: string },
) {
  "use server";
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const res = await fetch(`${proto}://${host}/api/assignments/${id}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      cookie: h.get("cookie") ?? "",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Request failed");
  }
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

function PendingRow({
  a,
  confirm,
  decline,
}: {
  a: {
    id: string;
    shift: {
      title: string;
      startAt: Date;
      endAt: Date;
      facility: { name: string };
    };
  };
  confirm: (fd: FormData) => void;
  decline: (fd: FormData) => void;
}) {
  return (
    <li className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">
            {a.shift.title}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {a.shift.facility.name} ·{" "}
            {a.shift.startAt.toLocaleString([], {
              dateStyle: "medium",
              timeStyle: "short",
            })}{" "}
            &mdash;{" "}
            {a.shift.endAt.toLocaleString([], {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
          PROPOSED
        </span>
      </div>

      <div className="mt-4 flex items-end gap-3">
        <form action={confirm}>
          <input type="hidden" name="id" value={a.id} />
          <button
            type="submit"
            className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-800"
          >
            Confirm
          </button>
        </form>

        <form action={decline} className="flex flex-1 items-end gap-2">
          <input type="hidden" name="id" value={a.id} />
          <div className="flex-1">
            <label className="block text-[10px] font-medium uppercase tracking-wider text-slate-500">
              Reason (optional)
            </label>
            <input
              type="text"
              name="note"
              placeholder="e.g. Schedule conflict"
              maxLength={200}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 shadow-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>
          <button
            type="submit"
            className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 shadow-sm transition hover:bg-red-50"
          >
            Decline
          </button>
        </form>
      </div>
    </li>
  );
}

function SimpleRow({
  title,
  subtitle,
  badge,
  note,
}: {
  title: string;
  subtitle: string;
  badge: { label: string; tone: "success" | "warning" | "danger" | "neutral" };
  note?: string;
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
          <p className="text-sm font-medium text-slate-900">{title}</p>
          <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
          {note && <p className="mt-1 text-xs italic text-slate-500">{note}</p>}
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
