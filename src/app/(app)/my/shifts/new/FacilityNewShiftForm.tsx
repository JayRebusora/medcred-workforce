// src/app/(app)/my/shifts/new/FacilityNewShiftForm.tsx
// Facility shift request — same as admin's NewShiftForm but with the
// facility dropdown removed (facilityId is derived from session server-side).

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EmployeeType, CredentialType } from "@prisma/client";

const EMPLOYEE_TYPES: { value: EmployeeType; label: string }[] = [
  { value: "REGISTERED_NURSE", label: "Registered Nurse (RN)" },
  {
    value: "LICENSED_PRACTICAL_NURSE",
    label: "Licensed Practical Nurse (LPN)",
  },
  {
    value: "CERTIFIED_NURSING_ASSISTANT",
    label: "Certified Nursing Assistant (CNA)",
  },
  { value: "RESPIRATORY_THERAPIST", label: "Respiratory Therapist (RT)" },
  { value: "MEDICAL_ASSISTANT", label: "Medical Assistant (MA)" },
];

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

function defaultStartAt() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setMinutes(0, 0, 0);
  return formatForDatetimeLocal(d);
}
function defaultEndAt() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(d.getHours() + 8);
  d.setMinutes(0, 0, 0);
  return formatForDatetimeLocal(d);
}
function formatForDatetimeLocal(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function FacilityNewShiftForm() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startAt, setStartAt] = useState(defaultStartAt());
  const [endAt, setEndAt] = useState(defaultEndAt());
  const [allowedEmployeeTypes, setAllowedEmployeeTypes] = useState<
    EmployeeType[]
  >([]);
  const [extraRequiredCredentials, setExtraRequiredCredentials] = useState<
    CredentialType[]
  >([]);
  const [hourlyRate, setHourlyRate] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle<T>(list: T[], value: T, setter: (next: T[]) => void) {
    setter(
      list.includes(value) ? list.filter((v) => v !== value) : [...list, value],
    );
  }

  const canSubmit =
    title.trim().length > 0 &&
    startAt &&
    endAt &&
    new Date(endAt) > new Date(startAt) &&
    allowedEmployeeTypes.length > 0;

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/shifts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          // No facilityId — server derives it from session for CLIENT role
          title: title.trim(),
          description: description.trim() || undefined,
          startAt: new Date(startAt).toISOString(),
          endAt: new Date(endAt).toISOString(),
          allowedEmployeeTypes,
          extraRequiredCredentials,
          hourlyRate: hourlyRate ? Number(hourlyRate) : undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Failed to create shift");
        setSubmitting(false);
        return;
      }
      router.push("/my/shifts?flash=requested");
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl rounded-lg border border-slate-200 bg-white p-6">
      {error && (
        <div
          role="alert"
          className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <div className="space-y-5">
        <Field label="Title">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Night shift — ICU"
            className={inputClass}
          />
        </Field>

        <Field label="Description (optional)">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="12-hour ICU night coverage. ACLS required."
            className={inputClass}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Start">
            <input
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="End">
            <input
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
        {startAt && endAt && new Date(endAt) <= new Date(startAt) && (
          <p className="text-xs text-red-600">
            End time must be after start time.
          </p>
        )}

        <div>
          <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-slate-600">
            Allowed employee types (at least one)
          </span>
          <div className="flex flex-wrap gap-2">
            {EMPLOYEE_TYPES.map((t) => {
              const on = allowedEmployeeTypes.includes(t.value);
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() =>
                    toggle(
                      allowedEmployeeTypes,
                      t.value,
                      setAllowedEmployeeTypes,
                    )
                  }
                  className={`rounded-md border px-3 py-1.5 text-xs font-medium transition ${
                    on
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-600">
            Extra required credentials
          </span>
          <p className="mb-2 text-xs text-slate-500">
            These are <em>in addition</em> to the baseline credentials each
            employee type already requires.
          </p>
          <div className="flex flex-wrap gap-2">
            {CREDENTIAL_TYPES.map((c) => {
              const on = extraRequiredCredentials.includes(c.value);
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() =>
                    toggle(
                      extraRequiredCredentials,
                      c.value,
                      setExtraRequiredCredentials,
                    )
                  }
                  className={`rounded-md border px-3 py-1.5 text-xs font-medium transition ${
                    on
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        <Field label="Hourly rate (optional)">
          <div className="relative max-w-[180px]">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
              $
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              className={`${inputClass} pl-7`}
              placeholder="55.00"
            />
          </div>
        </Field>
      </div>

      <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6">
        <Link
          href="/my/shifts"
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
          {submitting ? "Requesting..." : "Request shift"}
        </button>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900";

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
