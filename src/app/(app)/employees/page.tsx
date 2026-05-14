// src/app/(app)/employees/page.tsx
// Admin directory of all employees. Read-only. Closes issue #19.
//
// Shows every Employee in the system with their type, contact info,
// credential count, and shift activity. Filter by employee type.

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  EmployeeType,
  CredentialStatus,
  AssignmentStatus,
} from "@prisma/client";

const PAGE_SIZE = 25;

const TYPE_FILTERS = [
  { value: "ALL", label: "All types" },
  { value: "REGISTERED_NURSE", label: "Registered Nurse" },
  { value: "LICENSED_PRACTICAL_NURSE", label: "LPN" },
  { value: "CERTIFIED_NURSING_ASSISTANT", label: "CNA" },
  { value: "RESPIRATORY_THERAPIST", label: "Respiratory Therapist" },
  { value: "MEDICAL_ASSISTANT", label: "Medical Assistant" },
] as const;

type Props = {
  searchParams: Promise<{ type?: string; page?: string }>;
};

export default async function EmployeesPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard");

  const params = await searchParams;
  const typeFilter = params.type ?? "ALL";
  const pageNum = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const skip = (pageNum - 1) * PAGE_SIZE;

  const whereClause = {
    deletedAt: null,
    ...(typeFilter !== "ALL" && {
      employeeType: typeFilter as EmployeeType,
    }),
  };

  const [employees, totalCount] = await Promise.all([
    prisma.employee.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            createdAt: true,
          },
        },
        credentials: {
          where: {
            deletedAt: null,
            status: CredentialStatus.APPROVED,
          },
          select: { id: true },
        },
        assignments: {
          where: { status: AssignmentStatus.COMPLETED },
          select: { id: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.employee.count({ where: whereClause }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Employees
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          All credentialed healthcare workers on the platform.
        </p>
      </div>

      {/* Filter row */}
      <div className="mb-5 flex items-center gap-3">
        <label className="text-xs font-medium uppercase tracking-wider text-slate-500">
          Type:
        </label>
        <div className="flex flex-wrap gap-1.5">
          {TYPE_FILTERS.map((f) => (
            <Link
              key={f.value}
              href={
                f.value === "ALL" ? "/employees" : `/employees?type=${f.value}`
              }
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                typeFilter === f.value
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        {employees.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-slate-500">
            No employees match this filter.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-5 py-2.5 font-medium">Name</th>
                <th className="px-5 py-2.5 font-medium">Email</th>
                <th className="px-5 py-2.5 font-medium">Type</th>
                <th className="px-5 py-2.5 font-medium">Experience</th>
                <th className="px-5 py-2.5 font-medium text-center">
                  Credentials
                </th>
                <th className="px-5 py-2.5 font-medium text-center">
                  Shifts done
                </th>
                <th className="px-5 py-2.5 font-medium">Joined</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr
                  key={e.id}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                >
                  <td className="px-5 py-3 font-medium text-slate-900">
                    {e.user.firstName} {e.user.lastName}
                  </td>
                  <td className="px-5 py-3 text-slate-600">{e.user.email}</td>
                  <td className="px-5 py-3 text-slate-700">
                    {e.employeeType.replace(/_/g, " ")}
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {e.yearsExperience ?? "—"}{" "}
                    {e.yearsExperience !== null &&
                      e.yearsExperience !== undefined &&
                      "yrs"}
                  </td>
                  <td className="px-5 py-3 text-center text-slate-700">
                    {e.credentials.length}
                  </td>
                  <td className="px-5 py-3 text-center text-slate-700">
                    {e.assignments.length}
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {e.user.createdAt.toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/employees/${e.id}`}
                      className="text-sm font-medium text-slate-700 hover:underline"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <p className="text-slate-500">
            Page {pageNum} of {totalPages} · {totalCount} total
          </p>
          <div className="flex gap-2">
            <PageLink
              base={`/employees${typeFilter !== "ALL" ? `?type=${typeFilter}&` : "?"}`}
              page={pageNum - 1}
              disabled={pageNum <= 1}
              label="← Prev"
            />
            <PageLink
              base={`/employees${typeFilter !== "ALL" ? `?type=${typeFilter}&` : "?"}`}
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

function PageLink({
  base,
  page,
  disabled,
  label,
}: {
  base: string;
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
    <Link href={`${base}page=${page}`} className={cls}>
      {label}
    </Link>
  );
}
