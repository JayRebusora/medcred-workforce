// This page is a Server-side role router. Employees and facilities both have /my/shifts
// in their sidebar, and this file dispatches to the right component based
// on the session's role. Same pattern we used for /dashboard.

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { MyShiftsEmployee } from "./MyShiftsEmployee";
import { MyShiftsFacility } from "./MyShiftsFacility";

type Props = {
  searchParams: Promise<{ flash?: string }>;
};

export default async function MyShiftsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const sp = await searchParams;

  switch (session.user.role) {
    case "EMPLOYEE":
      return <MyShiftsEmployee userId={session.user.id} flash={sp.flash} />;
    case "CLIENT":
      return <MyShiftsFacility userId={session.user.id} flash={sp.flash} />;
    default:
      // Admins don't have a /my/shifts view; they use /shifts
      redirect("/shifts");
  }
}
