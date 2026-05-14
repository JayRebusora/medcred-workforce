// src/app/(app)/facilities/page.tsx
// Admin directory of all facilities. Read-only. Closes issue #20.

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ShiftStatus } from "@prisma/client";

const PAGE_SIZE = 25;

type Props = {
  searchParams: Promise<{ page?: string }>;
};

export default async function FacilitiesPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard");

  const params = await searchParams;
  const pageNum = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const skip = (pageNum - 1) * PAGE_SIZE;

  const whereClause = { deletedAt: null };

  const [facilities, totalCount] = await Promise.all([
    prisma.facility.findMany({
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
        shifts: {
          select: { id: true, status: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.facility.count({ where: whereClause }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Facilities
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          All hospitals and clinics on the platform.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        {facilities.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-slate-500">
            No facilities on the platform yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-5 py-2.5 font-medium">Name</th>
                <th className="px-5 py-2.5 font-medium">Type</th>
                <th className="px-5 py-2.5 font-medium">Location</th>
                <th className="px-5 py-2.5 font-medium">Contact</th>
                <th className="px-5 py-2.5 font-medium text-center">
                  Open shifts
                </th>
                <th className="px-5 py-2.5 font-medium text-center">
                  Total shifts
                </th>
                <th className="px-5 py-2.5 font-medium">Joined</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {facilities.map((f) => {
                const openShifts = f.shifts.filter(
                  (s) => s.status === ShiftStatus.OPEN,
                ).length;
                return (
                  <tr
                    key={f.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                  >
                    <td className="px-5 py-3 font-medium text-slate-900">
                      {f.name}
                    </td>
                    <td className="px-5 py-3 text-slate-700">
                      {f.facilityType ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {f.city && f.state ? `${f.city}, ${f.state}` : "—"}
                    </td>
                    <td className="px-5 py-3 text-slate-600">{f.user.email}</td>
                    <td className="px-5 py-3 text-center text-slate-700">
                      {openShifts}
                    </td>
                    <td className="px-5 py-3 text-center text-slate-700">
                      {f.shifts.length}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {f.user.createdAt.toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/facilities/${f.id}`}
                        className="text-sm font-medium text-slate-700 hover:underline"
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

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <p className="text-slate-500">
            Page {pageNum} of {totalPages} · {totalCount} total
          </p>
          <div className="flex gap-2">
            <Link
              href={`/facilities?page=${pageNum - 1}`}
              className={`rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 ${
                pageNum <= 1 ? "pointer-events-none opacity-40" : ""
              }`}
            >
              ← Prev
            </Link>
            <Link
              href={`/facilities?page=${pageNum + 1}`}
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
