// src/app/(app)/my/shifts/new/page.tsx
// Facility-only shift request form. Same fields as the admin form but WITHOUT
// a facility dropdown — the facility is implicit from the session. Posts to
// the same POST /api/shifts endpoint; backend derives facilityId from the
// session when role=CLIENT.

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { FacilityNewShiftForm } from "./FacilityNewShiftForm";

export default async function FacilityNewShiftPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "CLIENT") {
    redirect("/dashboard");
  }

  // Verify the facility exists for this user (belt-and-suspenders)
  const facility = await prisma.facility.findUnique({
    where: { userId: session.user.id },
    select: { id: true, name: true },
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

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Request a shift
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Submit a new shift for{" "}
          <span className="font-medium text-slate-700">{facility.name}</span>.
          Once created, an administrator will match it with an eligible
          employee.
        </p>
      </div>

      <FacilityNewShiftForm />
    </div>
  );
}
