// src/app/(app)/users/page.tsx
// Admin directory of all user accounts. Read-only. Closes issue #21.
//
// Shows every User in the system regardless of role. Filter by role.
// Toggle to include soft-deleted (inactive) users.

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

const PAGE_SIZE = 25;

const ROLE_FILTERS = [
  { value: "ALL", label: "All roles" },
  { value: "ADMIN", label: "Admin" },
  { value: "EMPLOYEE", label: "Employee" },
  { value: "CLIENT", label: "Facility" },
] as const;

type Props = {
  searchParams: Promise<{
    role?: string;
    includeInactive?: string;
    page?: string;
  }>;
};

export default async function UsersPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard");

  const params = await searchParams;
  const roleFilter = params.role ?? "ALL";
  const includeInactive = params.includeInactive === "true";
  const pageNum = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const skip = (pageNum - 1) * PAGE_SIZE;

  const whereClause = {
    ...(!includeInactive && { deletedAt: null }),
    ...(roleFilter !== "ALL" && {
      role: roleFilter as Role,
    }),
  };

  const [users, totalCount] = await Promise.all([
    prisma.user.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.user.count({ where: whereClause }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Users
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          All accounts on the platform — admins, employees, and facility
          clients.
        </p>
      </div>

      {/* Filter row */}
      <div className="mb-5 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Role:
          </label>
          <div className="flex flex-wrap gap-1.5">
            {ROLE_FILTERS.map((f) => (
              <Link
                key={f.value}
                href={
                  f.value === "ALL"
                    ? buildUrl({ role: undefined, includeInactive })
                    : buildUrl({ role: f.value, includeInactive })
                }
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  roleFilter === f.value
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"
                }`}
              >
                {f.label}
              </Link>
            ))}
          </div>
        </div>

        <Link
          href={buildUrl({
            role: roleFilter,
            includeInactive: !includeInactive,
          })}
          className={`rounded-md border px-3 py-1.5 text-xs font-medium transition ${
            includeInactive
              ? "border-amber-300 bg-amber-50 text-amber-800"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          {includeInactive ? "✓ Showing inactive" : "+ Show inactive"}
        </Link>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        {users.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-slate-500">
            No users match this filter.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-5 py-2.5 font-medium">Name</th>
                <th className="px-5 py-2.5 font-medium">Email</th>
                <th className="px-5 py-2.5 font-medium">Role</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
                <th className="px-5 py-2.5 font-medium">Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                >
                  <td className="px-5 py-3 font-medium text-slate-900">
                    {u.firstName} {u.lastName}
                  </td>
                  <td className="px-5 py-3 text-slate-600">{u.email}</td>
                  <td className="px-5 py-3 text-slate-700">
                    <RoleBadge role={u.role} />
                  </td>
                  <td className="px-5 py-3">
                    {u.deletedAt ? (
                      <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                        Inactive
                      </span>
                    ) : (
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {u.createdAt.toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/users/${u.id}`}
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
            <Link
              href={buildUrl({
                role: roleFilter,
                includeInactive,
                page: pageNum - 1,
              })}
              className={`rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 ${
                pageNum <= 1 ? "pointer-events-none opacity-40" : ""
              }`}
            >
              ← Prev
            </Link>
            <Link
              href={buildUrl({
                role: roleFilter,
                includeInactive,
                page: pageNum + 1,
              })}
              className={`rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 ${
                pageNum >= totalPages ? "pointer-events-none opacity-40" : ""
              }`}
            >
              Next →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// Build a query string preserving filter state across navigation
function buildUrl({
  role,
  includeInactive,
  page,
}: {
  role?: string;
  includeInactive?: boolean;
  page?: number;
}): string {
  const params = new URLSearchParams();
  if (role && role !== "ALL") params.set("role", role);
  if (includeInactive) params.set("includeInactive", "true");
  if (page && page > 1) params.set("page", page.toString());
  const qs = params.toString();
  return qs ? `/users?${qs}` : "/users";
}

function RoleBadge({ role }: { role: Role }) {
  const map = {
    ADMIN: "bg-violet-50 text-violet-700 border-violet-200",
    EMPLOYEE: "bg-blue-50 text-blue-700 border-blue-200",
    CLIENT: "bg-emerald-50 text-emerald-700 border-emerald-200",
  } as const;
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${map[role]}`}
    >
      {role.toLowerCase()}
    </span>
  );
}
