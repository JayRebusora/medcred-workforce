// The Admin-only shift creation form. Posts to POST /api/shifts.
//
// Note: route protection: middleware lets any authenticated user reach
// (app)/*, so we do the admin check in the server component wrapper.

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NewShiftForm } from "./NewShiftForm";

export default async function NewShiftPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  // Load facilities for the dropdown
  const facilities = await prisma.facility.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
    select: { id: true, name: true, city: true, state: true },
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Create a shift
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Schedule a new shift at a facility. Employees matching the role and
          credential requirements will be eligible for assignment.
        </p>
      </div>

      <NewShiftForm facilities={facilities} />
    </div>
  );
}
