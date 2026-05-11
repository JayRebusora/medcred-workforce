// src/app/(app)/my/credentials/new/NewCredentialForm.tsx
// Client-side form for creating a credential. Posts to POST /api/credentials.
// Supports both "new" and "renew" modes via the prefill props.

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CredentialType } from "@prisma/client";

const CREDENTIAL_TYPES: { value: CredentialType; label: string }[] = [
  { value: "RN_LICENSE", label: "RN License" },
  { value: "LPN_LICENSE", label: "LPN License" },
  { value: "CNA_CERTIFICATION", label: "CNA Certification" },
  { value: "BLS_CERTIFICATION", label: "BLS Certification" },
  { value: "ACLS_CERTIFICATION", label: "ACLS Certification" },
  { value: "PALS_CERTIFICATION", label: "PALS Certification" },
  { value: "RT_LICENSE", label: "Respiratory Therapy License" },
  { value: "MA_CERTIFICATION", label: "MA Certification" },
  { value: "TB_TEST", label: "TB Test" },
  { value: "COVID_VACCINATION", label: "COVID Vaccination" },
];

type Props = {
  prefillType: string | null;
  prefillIssuingBody: string | null;
  isRenewal: boolean;
};

function formatForDateInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function defaultIssuedDate(): string {
  // Today, as a reasonable default
  return formatForDateInput(new Date());
}

function defaultExpiryDate(): string {
  // Two years from today — typical for nursing licenses
  const d = new Date();
  d.setFullYear(d.getFullYear() + 2);
  return formatForDateInput(d);
}

export function NewCredentialForm({
  prefillType,
  prefillIssuingBody,
  isRenewal,
}: Props) {
  const router = useRouter();

  const [type, setType] = useState<string>(prefillType ?? "RN_LICENSE");
  const [credentialNumber, setCredentialNumber] = useState("");
  const [issuingBody, setIssuingBody] = useState(prefillIssuingBody ?? "");
  const [issuedDate, setIssuedDate] = useState(defaultIssuedDate());
  const [expiryDate, setExpiryDate] = useState(defaultExpiryDate());
  const [documentUrl, setDocumentUrl] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    type.length > 0 &&
    issuedDate &&
    expiryDate &&
    new Date(expiryDate) > new Date(issuedDate);

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/credentials", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type,
          credentialNumber: credentialNumber.trim() || undefined,
          issuingBody: issuingBody.trim() || undefined,
          issuedDate: new Date(issuedDate).toISOString(),
          expiryDate: new Date(expiryDate).toISOString(),
          documentUrl: documentUrl.trim() || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Failed to add credential");
        setSubmitting(false);
        return;
      }
      router.push(`/my/credentials?flash=${isRenewal ? "renewed" : "added"}`);
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl rounded-lg border border-slate-200 bg-white p-6">
      {error && (
        <div
          role="alert"
          className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <div className="space-y-5">
        <Field label="Credential type">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            disabled={isRenewal} // can't change type when renewing
            className={inputClass}
          >
            {CREDENTIAL_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          {isRenewal && (
            <p className="mt-1 text-xs text-slate-500">
              Renewals keep the same credential type.
            </p>
          )}
        </Field>

        <Field label="Credential number (optional)">
          <input
            type="text"
            value={credentialNumber}
            onChange={(e) => setCredentialNumber(e.target.value)}
            placeholder="e.g. PA-RN-12345"
            className={inputClass}
          />
        </Field>

        <Field label="Issuing body (optional)">
          <input
            type="text"
            value={issuingBody}
            onChange={(e) => setIssuingBody(e.target.value)}
            placeholder="e.g. Pennsylvania State Board of Nursing"
            className={inputClass}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Issued date">
            <input
              type="date"
              value={issuedDate}
              onChange={(e) => setIssuedDate(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Expiry date">
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
        {issuedDate &&
          expiryDate &&
          new Date(expiryDate) <= new Date(issuedDate) && (
            <p className="text-xs text-red-600">
              Expiry date must be after the issued date.
            </p>
          )}

        <Field label="Document URL (optional)">
          <input
            type="url"
            value={documentUrl}
            onChange={(e) => setDocumentUrl(e.target.value)}
            placeholder="https://..."
            className={inputClass}
          />
          <p className="mt-1 text-xs text-slate-500">
            File uploads will be supported in a future release. For now, paste a
            link to your credential document if you have one online.
          </p>
        </Field>
      </div>

      <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6">
        <Link
          href="/my/credentials"
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          Cancel
        </Link>
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit || submitting}
          className="rounded-md bg-slate-900 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting
            ? "Submitting..."
            : isRenewal
              ? "Submit renewal"
              : "Submit credential"}
        </button>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:bg-slate-50 disabled:text-slate-500";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-600">
        {label}
      </span>
      {children}
    </label>
  );
}
