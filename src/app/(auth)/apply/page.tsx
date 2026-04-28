// 3-step application wizard.
// Steps:
//   1. Role + personal info
//   2. Role-specific details (+ credentials for employees)
//   3. Review + submit

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EmployeeType, Role, CredentialType } from "@prisma/client";
import type {
  ApplicationInput,
  ApplicationCredentialInput,
} from "@/lib/validation/application";

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

export default function ApplyPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const [form, setForm] = useState<Partial<ApplicationInput>>({
    roleType: "EMPLOYEE",
    credentials: [],
  });

  const update = <K extends keyof ApplicationInput>(
    key: K,
    value: ApplicationInput[K],
  ) => setForm((f) => ({ ...f, [key]: value }));

  const addCredential = () => {
    const next: ApplicationCredentialInput = {
      type: "RN_LICENSE",
      credentialNumber: "",
      issuingBody: "",
      issuedDate: new Date().toISOString().slice(0, 10),
      expiryDate: new Date(Date.now() + 365 * 86400000)
        .toISOString()
        .slice(0, 10),
    };
    update("credentials", [...(form.credentials ?? []), next]);
  };

  const removeCredential = (idx: number) => {
    update(
      "credentials",
      (form.credentials ?? []).filter((_, i) => i !== idx),
    );
  };

  const updateCredential = (
    idx: number,
    patch: Partial<ApplicationCredentialInput>,
  ) => {
    update(
      "credentials",
      (form.credentials ?? []).map((c, i) =>
        i === idx ? { ...c, ...patch } : c,
      ),
    );
  };

  // Basic front-end gate — server will re-validate everything
  function canAdvanceFromStep1() {
    return form.roleType && form.firstName && form.lastName && form.email;
  }
  function canAdvanceFromStep2() {
    if (form.roleType === "EMPLOYEE") {
      return form.employeeType && form.yearsOfExperience !== undefined;
    }
    return (
      form.facilityName &&
      form.addressLine1 &&
      form.city &&
      form.state &&
      form.zipCode
    );
  }

  async function submit() {
    setServerError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await res.json();
      if (!res.ok) {
        setServerError(body.error ?? "Failed to submit application");
        setSubmitting(false);
        return;
      }
      router.push("/apply/thanks");
    } catch {
      setServerError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-2xl">
        <div className="mb-5 flex items-center justify-between">
          <Link
            href="/"
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            &larr; Back
          </Link>
          <span className="text-sm text-slate-500">Step {step} of 3</span>
        </div>

        {/* Step indicator */}
        <div className="mb-6 flex gap-1.5">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={`h-1 flex-1 rounded-full transition ${
                n <= step ? "bg-slate-900" : "bg-slate-200"
              }`}
            />
          ))}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          {serverError && (
            <div
              role="alert"
              className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {serverError}
            </div>
          )}

          {step === 1 && <Step1 form={form} update={update} />}
          {step === 2 && (
            <Step2
              form={form}
              update={update}
              addCredential={addCredential}
              removeCredential={removeCredential}
              updateCredential={updateCredential}
            />
          )}
          {step === 3 && <Step3 form={form} />}

          {/* Navigation */}
          <div className="mt-8 flex justify-between border-t border-slate-100 pt-6">
            <button
              type="button"
              disabled={step === 1}
              onClick={() =>
                setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s))
              }
              className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← Back
            </button>

            {step < 3 ? (
              <button
                type="button"
                disabled={
                  (step === 1 && !canAdvanceFromStep1()) ||
                  (step === 2 && !canAdvanceFromStep2())
                }
                onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
                className="rounded-md bg-slate-900 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue →
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={submit}
                className="rounded-md bg-slate-900 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit application"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step 1 — Role + personal info ──────────────────────────────────

function Step1({
  form,
  update,
}: {
  form: Partial<ApplicationInput>;
  update: <K extends keyof ApplicationInput>(
    k: K,
    v: ApplicationInput[K],
  ) => void;
}) {
  return (
    <>
      <h2 className="text-xl font-semibold text-slate-900">
        Tell us who you are
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Start by selecting whether you&rsquo;re applying as a healthcare
        professional or a facility.
      </p>

      <div className="mt-6 space-y-5">
        <div>
          <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-slate-600">
            I&rsquo;m applying as
          </span>
          <div className="grid grid-cols-2 gap-3">
            <RoleCard
              selected={form.roleType === "EMPLOYEE"}
              onClick={() => update("roleType", "EMPLOYEE")}
              title="Healthcare professional"
              subtitle="Nurse, CNA, RT, etc."
            />
            <RoleCard
              selected={form.roleType === "CLIENT"}
              onClick={() => update("roleType", "CLIENT")}
              title="Facility"
              subtitle="Hospital, clinic, LTC"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="First name">
            <input
              type="text"
              value={form.firstName ?? ""}
              onChange={(e) => update("firstName", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Last name">
            <input
              type="text"
              value={form.lastName ?? ""}
              onChange={(e) => update("lastName", e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="Email">
          <input
            type="email"
            value={form.email ?? ""}
            onChange={(e) => update("email", e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Phone (optional)">
          <input
            type="tel"
            value={form.phone ?? ""}
            onChange={(e) => update("phone", e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>
    </>
  );
}

// ─── Step 2 — Role-specific details ─────────────────────────────────

function Step2({
  form,
  update,
  addCredential,
  removeCredential,
  updateCredential,
}: {
  form: Partial<ApplicationInput>;
  update: <K extends keyof ApplicationInput>(
    k: K,
    v: ApplicationInput[K],
  ) => void;
  addCredential: () => void;
  removeCredential: (idx: number) => void;
  updateCredential: (
    idx: number,
    patch: Partial<ApplicationCredentialInput>,
  ) => void;
}) {
  if (form.roleType === "EMPLOYEE") {
    return (
      <>
        <h2 className="text-xl font-semibold text-slate-900">
          Professional details
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Tell us about your role and the credentials you hold. You&rsquo;ll
          upload documents after your application is approved.
        </p>

        <div className="mt-6 space-y-5">
          <Field label="Role type">
            <select
              value={form.employeeType ?? ""}
              onChange={(e) =>
                update("employeeType", e.target.value as EmployeeType)
              }
              className={inputClass}
            >
              <option value="" disabled>
                Select your role
              </option>
              {EMPLOYEE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Years of experience">
            <input
              type="number"
              min={0}
              max={70}
              value={form.yearsOfExperience ?? ""}
              onChange={(e) =>
                update("yearsOfExperience", Number(e.target.value))
              }
              className={inputClass}
            />
          </Field>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-600">
                Credentials ({(form.credentials ?? []).length})
              </span>
              <button
                type="button"
                onClick={addCredential}
                className="text-xs font-medium text-slate-700 hover:text-slate-900"
              >
                + Add credential
              </button>
            </div>

            {(form.credentials ?? []).length === 0 ? (
              <p className="rounded-md border border-dashed border-slate-300 px-3 py-5 text-center text-xs text-slate-500">
                No credentials added yet. Click &ldquo;Add credential&rdquo; to
                claim a license or certification.
              </p>
            ) : (
              <div className="space-y-3">
                {(form.credentials ?? []).map((c, idx) => (
                  <div
                    key={idx}
                    className="rounded-md border border-slate-200 bg-slate-50 p-3"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <select
                        value={c.type}
                        onChange={(e) =>
                          updateCredential(idx, {
                            type: e.target.value as CredentialType,
                          })
                        }
                        className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                      >
                        {CREDENTIAL_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => removeCredential(idx)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Credential number"
                        value={c.credentialNumber ?? ""}
                        onChange={(e) =>
                          updateCredential(idx, {
                            credentialNumber: e.target.value,
                          })
                        }
                        className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Issuing body"
                        value={c.issuingBody ?? ""}
                        onChange={(e) =>
                          updateCredential(idx, { issuingBody: e.target.value })
                        }
                        className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                      />
                      <div>
                        <label className="text-[10px] uppercase text-slate-500">
                          Issued
                        </label>
                        <input
                          type="date"
                          value={c.issuedDate}
                          onChange={(e) =>
                            updateCredential(idx, {
                              issuedDate: e.target.value,
                            })
                          }
                          className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase text-slate-500">
                          Expires
                        </label>
                        <input
                          type="date"
                          value={c.expiryDate}
                          onChange={(e) =>
                            updateCredential(idx, {
                              expiryDate: e.target.value,
                            })
                          }
                          className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  // CLIENT
  return (
    <>
      <h2 className="text-xl font-semibold text-slate-900">Facility details</h2>
      <p className="mt-1 text-sm text-slate-500">
        Tell us about your facility so we can set up your account.
      </p>

      <div className="mt-6 space-y-5">
        <Field label="Facility name">
          <input
            type="text"
            value={form.facilityName ?? ""}
            onChange={(e) => update("facilityName", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Address">
          <input
            type="text"
            value={form.addressLine1 ?? ""}
            onChange={(e) => update("addressLine1", e.target.value)}
            className={inputClass}
          />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="City">
            <input
              type="text"
              value={form.city ?? ""}
              onChange={(e) => update("city", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="State">
            <input
              type="text"
              value={form.state ?? ""}
              onChange={(e) => update("state", e.target.value)}
              className={inputClass}
              maxLength={2}
              placeholder="PA"
            />
          </Field>
          <Field label="ZIP">
            <input
              type="text"
              value={form.zipCode ?? ""}
              onChange={(e) => update("zipCode", e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
      </div>
    </>
  );
}

// ─── Step 3 — Review ────────────────────────────────────────────────

function Step3({ form }: { form: Partial<ApplicationInput> }) {
  return (
    <>
      <h2 className="text-xl font-semibold text-slate-900">Review & submit</h2>
      <p className="mt-1 text-sm text-slate-500">
        Take a moment to confirm everything looks right. You&rsquo;ll receive an
        email once an administrator reviews your application.
      </p>

      <dl className="mt-6 space-y-5 text-sm">
        <Section label="Role">
          <Row
            k="Applying as"
            v={
              form.roleType === "EMPLOYEE"
                ? "Healthcare professional"
                : "Facility"
            }
          />
        </Section>

        <Section label="Contact">
          <Row k="Name" v={`${form.firstName} ${form.lastName}`} />
          <Row k="Email" v={form.email ?? ""} />
          {form.phone && <Row k="Phone" v={form.phone} />}
        </Section>

        {form.roleType === "EMPLOYEE" && (
          <>
            <Section label="Professional">
              <Row
                k="Role type"
                v={form.employeeType?.replace(/_/g, " ") ?? ""}
              />
              <Row
                k="Years of experience"
                v={String(form.yearsOfExperience ?? 0)}
              />
            </Section>
            {(form.credentials ?? []).length > 0 && (
              <Section
                label={`Credentials claimed (${form.credentials!.length})`}
              >
                {(form.credentials ?? []).map((c, i) => (
                  <Row
                    key={i}
                    k={c.type.replace(/_/g, " ")}
                    v={`${c.credentialNumber ?? "—"} · expires ${c.expiryDate}`}
                  />
                ))}
              </Section>
            )}
          </>
        )}

        {form.roleType === "CLIENT" && (
          <Section label="Facility">
            <Row k="Name" v={form.facilityName ?? ""} />
            <Row
              k="Address"
              v={`${form.addressLine1}, ${form.city}, ${form.state} ${form.zipCode}`}
            />
          </Section>
        )}
      </dl>

      <p className="mt-6 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
        By submitting, you confirm that the information above is accurate. An
        administrator will review your application within 48 hours.
      </p>
    </>
  );
}

// ─── Tiny UI primitives ─────────────────────────────────────────────

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

function RoleCard({
  selected,
  onClick,
  title,
  subtitle,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border p-4 text-left transition ${
        selected
          ? "border-slate-900 bg-slate-50 ring-1 ring-slate-900"
          : "border-slate-300 bg-white hover:border-slate-400"
      }`}
    >
      <p className="text-sm font-medium text-slate-900">{title}</p>
      <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
    </button>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <div className="divide-y divide-slate-100 rounded-md border border-slate-200 bg-white">
        {children}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <dt className="text-xs text-slate-500">{k}</dt>
      <dd className="text-sm text-slate-900">{v}</dd>
    </div>
  );
}
