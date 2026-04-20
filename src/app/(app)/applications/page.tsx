// src/app/(app)/applications/page.tsx
// Admin-only list of applications. Filters by status via query param (?status=PENDING).
// Defaults to pending.

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ApplicationStatus } from "@prisma/client";

type Props = {
  searchParams: Promise<{ status?: string }>;
};

const STATUSES: ApplicationStatus[] = ["PENDING", "APPROVED", "DECLINED"];

export default async function ApplicationsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard");

  const params = await searchParams;
  const activeStatus: ApplicationStatus = (STATUSES as string[]).includes(
    params.status ?? "",
  )
    ? (params.status as ApplicationStatus)
    : "PENDING";

  const [applications, counts] = await Promise.all([
    prisma.application.findMany({
      where: { status: activeStatus },
      orderBy: { createdAt: "desc" },
    }),
    Promise.all(
      STATUSES.map(async (s) => ({
        status: s,
        count: await prisma.application.count({ where: { status: s } }),
      })),
    ),
  ]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Applications
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Review submissions from prospective employees and facilities.
        </p>
      </div>

      {/* Status tabs */}
      <div className="mb-5 flex gap-1 border-b border-slate-200">
        {counts.map(({ status, count }) => (
          <Link
            key={status}
            href={`/applications?status=${status}`}
            className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition ${
              activeStatus === status
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {status.charAt(0) + status.slice(1).toLowerCase()}
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
        {applications.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-slate-500">
            No {activeStatus.toLowerCase()} applications.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-5 py-2.5 font-medium">Name</th>
                <th className="px-5 py-2.5 font-medium">Email</th>
                <th className="px-5 py-2.5 font-medium">Applying as</th>
                <th className="px-5 py-2.5 font-medium">Submitted</th>
                <th className="px-5 py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
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
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/applications/${app.id}`}
                      className="text-sm font-medium text-slate-700 hover:text-slate-900 hover:underline"
                    >
                      Review →
                    </Link>
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
