// src/app/(app)/my/credentials/new/page.tsx
// Page wrapper for the add-credential form. Server component that does
// the auth guard and resolves the "renew" query param to a pre-filled
// type for renewal flows.

import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NewCredentialForm } from "./NewCredentialForm";

type Props = {
  searchParams: Promise<{ renew?: string }>;
};

export default async function NewCredentialPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || session.user.role !== "EMPLOYEE") {
    redirect("/dashboard");
  }

  const sp = await searchParams;

  // If ?renew=CRED_ID is present, look up the credential being renewed
  // so we can prefill the type (and verify the user owns it).
  let renewFrom: { type: string; issuingBody: string | null } | null = null;
  if (sp.renew) {
    const employee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (employee) {
      const cred = await prisma.credential.findFirst({
        where: {
          id: sp.renew,
          employeeId: employee.id, // ownership check
          deletedAt: null,
        },
        select: { type: true, issuingBody: true },
      });
      if (cred) {
        renewFrom = cred;
      }
    }
  }

  const isRenewal = renewFrom !== null;

  return (
    <div className="p-6">
      <Link
        href="/my/credentials"
        className="mb-4 inline-block text-sm text-slate-600 hover:text-slate-900"
      >
        &larr; Back to credentials
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          {isRenewal ? "Renew credential" : "Add a credential"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {isRenewal
            ? "Your existing credential will stay on file for audit purposes. The new credential will be submitted for admin review."
            : "Submit a license or certification. An administrator will review it before it counts for shift eligibility."}
        </p>
      </div>

      <NewCredentialForm
        prefillType={renewFrom?.type ?? null}
        prefillIssuingBody={renewFrom?.issuingBody ?? null}
        isRenewal={isRenewal}
      />
    </div>
  );
}
