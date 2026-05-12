// src/app/(app)/credentials/page.tsx
// Admin credential review queue. Lists every credential in the system
// with status filter tabs, mirroring the Applications and Shifts list
// patterns we've used elsewhere.
//
// Issue #7 acceptance criteria:
//   - Filter tabs: PENDING / APPROVED / REJECTED / EXPIRED
//   - Each row shows employee name, credential type, number, expiry, status
//   - Click row → /credentials/[id] for review
//
// Note on EXPIRED: it's a tab but never the actual `status` value of a
// credential — it's derived from expiryDate. We compute it in the query
// so the UI can show "what's expired now" without writing it back to db.

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CredentialStatus } from "@prisma/client";

const PAGE_SIZE = 25;

// We display these tabs in this exact order across the top of the page
const TABS = ["PENDING", "APPROVED", "REJECTED", "EXPIRED"] as const;
type Tab = (typeof TABS)[number];

type Props = {
  searchParams: Promise<{ tab?: string; page?: string }>;
};

export default async function AdminCredentialsPage({ searchParams }: Props) {
  // 1. AuthZ
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard");

  const params = await searchParams;
  const activeTab: Tab = (TABS as readonly string[]).includes(params.tab ?? "")
    ? (params.tab as Tab)
    : "PENDING";
  const pageNum = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const skip = (pageNum - 1) * PAGE_SIZE;

  const now = new Date();

  // Translate "active tab" into a Prisma where clause
  const whereForTab = (tab: Tab) => {
    if (tab === "EXPIRED") {
      // Anything APPROVED but past its expiry — derived state
      return {
        deletedAt: null,
        status: CredentialStatus.APPROVED,
        expiryDate: { lt: now },
      };
    }
    if (tab === "APPROVED") {
      // APPROVED and not yet expired
      return {
        deletedAt: null,
        status: CredentialStatus.APPROVED,
        expiryDate: { gte: now },
      };
    }
    return {
      deletedAt: null,
      status: CredentialStatus[tab],
    };
  };

  // 2. Counts for tab badges + rows for the active tab, in parallel
  const [counts, rows, totalForTab] = await Promise.all([
    Promise.all(
      TABS.map(async (tab) => ({
        tab,
        count: await prisma.credential.count({ where: whereForTab(tab) }),
      })),
    ),
    prisma.credential.findMany({
      where: whereForTab(activeTab),
      include: {
        employee: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: [
        // For pending, oldest first (FIFO review queue)
        // For everything else, newest first (recent activity)
        activeTab === "PENDING" ? { createdAt: "asc" } : { updatedAt: "desc" },
      ],
      skip,
      take: PAGE_SIZE,
    }),
    prisma.credential.count({ where: whereForTab(activeTab) }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalForTab / PAGE_SIZE));

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Credentials
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Review submitted licenses and certifications. Pending credentials
          require approval before they count for shift eligibility.
        </p>
      </div>

      {/* Status tabs */}
      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-slate-200">
        {counts.map(({ tab, count }) => (
          <Link
            key={tab}
            href={`/credentials?tab=${tab}`}
            className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition ${
              activeTab === tab
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {labelize(tab)}
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                activeTab === tab
                  ? "bg-slate-900 text-white"
                  : tab === "PENDING" && count > 0
                    ? "bg-amber-100 text-amber-800"
                    : "bg-slate-100 text-slate-600"
              }`}
            >
              {count}
            </span>
          </Link>
        ))}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        {rows.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-slate-500">
            No credentials in {labelize(activeTab).toLowerCase()} state.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-5 py-2.5 font-medium">Employee</th>
                <th className="px-5 py-2.5 font-medium">Type</th>
                <th className="px-5 py-2.5 font-medium">Number</th>
                <th className="px-5 py-2.5 font-medium">Issuing body</th>
                <th className="px-5 py-2.5 font-medium">Expires</th>
                <th className="px-5 py-2.5 font-medium">Submitted</th>
                <th className="px-5 py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                >
                  <td className="px-5 py-3 font-medium text-slate-900">
                    {c.employee.user.firstName} {c.employee.user.lastName}
                  </td>
                  <td className="px-5 py-3 text-slate-700">
                    {c.type.replace(/_/g, " ")}
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-600">
                    {c.credentialNumber ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {c.issuingBody ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {c.expiryDate.toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {c.createdAt.toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/credentials/${c.id}`}
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <p className="text-slate-500">
            Page {pageNum} of {totalPages} &middot; {totalForTab} total
          </p>
          <div className="flex gap-2">
            <PageLink
              activeTab={activeTab}
              page={pageNum - 1}
              disabled={pageNum <= 1}
              label="← Prev"
            />
            <PageLink
              activeTab={activeTab}
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

function labelize(tab: Tab): string {
  return tab.charAt(0) + tab.slice(1).toLowerCase();
}

function PageLink({
  activeTab,
  page,
  disabled,
  label,
}: {
  activeTab: Tab;
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
    <Link href={`/credentials?tab=${activeTab}&page=${page}`} className={cls}>
      {label}
    </Link>
  );
}
