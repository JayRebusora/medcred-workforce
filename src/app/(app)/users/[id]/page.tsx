// src/app/(app)/users/[id]/page.tsx
// Admin view of a single user account. Shows account metadata and links
// to the role-specific profile (employee or facility) where applicable.

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function UserDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard");

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      employee: {
        select: { id: true, employeeType: true },
      },
      facility: {
        select: { id: true, name: true },
      },
    },
  });

  if (!user) {
    return (
      <div className="p-6">
        <p className="text-sm text-slate-600">User not found.</p>
        <Link
          href="/users"
          className="mt-4 inline-block text-sm font-medium text-slate-700 hover:underline"
        >
          ← Back to users
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Link
        href="/users"
        className="mb-4 inline-block text-sm text-slate-600 hover:text-slate-900"
      >
        ← Back to users
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {user.firstName} {user.lastName}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            <RoleBadge role={user.role} /> · Created{" "}
            {user.createdAt.toLocaleDateString()}
          </p>
        </div>
        {user.deletedAt ? (
          <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
            Inactive
          </span>
        ) : (
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            Active
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card title="Account">
          <Row k="Email">{user.email}</Row>
          <Row k="Phone">{user.phoneNumber ?? "—"}</Row>
          <Row k="Role">{user.role.toLowerCase()}</Row>
          <Row k="Created">{user.createdAt.toLocaleDateString()}</Row>
          {user.deletedAt && (
            <Row k="Deactivated">{user.deletedAt.toLocaleDateString()}</Row>
          )}
        </Card>

        <Card title="Profile">
          {user.role === "EMPLOYEE" && user.employee && (
            <div className="px-4 py-3 text-sm text-slate-700">
              <p className="mb-3">
                This account is linked to an employee profile.
              </p>
              <p className="mb-3 text-xs text-slate-500">
                Type: {user.employee.employeeType.replace(/_/g, " ")}
              </p>
              <Link
                href={`/employees/${user.employee.id}`}
                className="text-sm font-medium text-slate-900 hover:underline"
              >
                View employee profile →
              </Link>
            </div>
          )}

          {user.role === "CLIENT" && user.facility && (
            <div className="px-4 py-3 text-sm text-slate-700">
              <p className="mb-3">This account is linked to a facility.</p>
              <p className="mb-3 text-xs text-slate-500">
                Facility: {user.facility.name}
              </p>
              <Link
                href={`/facilities/${user.facility.id}`}
                className="text-sm font-medium text-slate-900 hover:underline"
              >
                View facility profile →
              </Link>
            </div>
          )}

          {user.role === "ADMIN" && (
            <div className="px-4 py-3 text-sm text-slate-700">
              <p>This is an administrator account.</p>
              <p className="mt-2 text-xs text-slate-500">
                Admin accounts have full access to the platform's review and
                management features. They are not linked to a separate profile.
              </p>
            </div>
          )}

          {user.role === "EMPLOYEE" && !user.employee && (
            <div className="px-4 py-3 text-sm text-amber-700">
              ⚠ This employee account has no profile record. This may indicate
              an incomplete onboarding flow.
            </div>
          )}

          {user.role === "CLIENT" && !user.facility && (
            <div className="px-4 py-3 text-sm text-amber-700">
              ⚠ This facility account has no facility record. This may indicate
              an incomplete onboarding flow.
            </div>
          )}
        </Card>
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

function RoleBadge({ role }: { role: Role }) {
  const map = {
    ADMIN: "bg-violet-50 text-violet-700 border-violet-200",
    EMPLOYEE: "bg-blue-50 text-blue-700 border-blue-200",
    CLIENT: "bg-emerald-50 text-emerald-700 border-emerald-200",
  } as const;
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${map[role]}`}
    >
      {role.toLowerCase()}
    </span>
  );
}
