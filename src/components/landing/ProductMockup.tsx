// src/components/landing/ProductMockup.tsx
// The signature visual moment of the landing page. A floating shift card
// flanked by two satellite cards — Verification on the left, Snapshot on
// the right. Each is a real-feel preview of a product moment.
//
// Layout: a 3-column grid at lg+ where the main card is wider than each
// satellite. Below lg we collapse to a single column, satellites first,
// then the main card. This keeps everything visible on every screen size.

export function ProductMockup() {
  return (
    <section className="relative">
      <div className="mx-auto max-w-6xl px-6 mb-24">
        {/* Decorative dotted connector behind the cards (large screens) */}
        <div className="relative">
          <DottedRail />

          <div className="relative z-10 grid gap-5 lg:grid-cols-12 items-center">
            {/* LEFT satellite — Verification */}
            <div
              className="lg:col-span-3 rise-sm order-2 lg:order-1"
              style={{ animationDelay: "0.85s" }}
            >
              <div
                className="surface p-5 lg:transform lg:-rotate-1"
                style={{ transformOrigin: "center" }}
              >
                <div className="eyebrow mb-2">Verification</div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckIcon />
                  <span className="font-medium text-ink">RN License</span>
                </div>
                <p className="text-xs text-muted mt-1 mono">
                  PA-RN-12345 · expires 2027
                </p>
                <div className="flex items-center gap-2 text-sm mt-3">
                  <CheckIcon />
                  <span className="font-medium text-ink">
                    BLS Certification
                  </span>
                </div>
                <p className="text-xs text-muted mt-1 mono">
                  AHA · expires 2026
                </p>
                <div className="mt-4 pt-3 border-t border-line-soft">
                  <p className="text-[11px] text-mute2">
                    Verified live against issuing bodies.
                  </p>
                </div>
              </div>
            </div>

            {/* MAIN — shift detail card */}
            <div
              className="lg:col-span-6 rise order-1 lg:order-2"
              style={{ animationDelay: "0.6s" }}
            >
              <div className="surface-lg p-7 md:p-9">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="eyebrow mb-2">Shift detail</div>
                    <h3 className="display text-2xl">Night Shift — ICU</h3>
                    <p className="mt-1 text-sm text-muted">
                      Henry Memorial Hospital · Tonight · 7pm–7am
                    </p>
                  </div>
                  <span className="chip chip-warn">OPEN</span>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="chip mono">RN</span>
                  <span className="chip mono">+ ACLS</span>
                  <span className="chip">$65 / hr</span>
                </div>

                {/* Eligibility list */}
                <div className="mt-6 border-t border-line-soft pt-5">
                  <div className="eyebrow mb-3">Eligibility check · live</div>
                  <ul className="space-y-2.5">
                    <CandidateRow
                      name="Nora Reyes"
                      meta="RN · 8 yrs"
                      status="eligible"
                      note="2 credentials verified"
                      emphasis
                    />
                    <CandidateRow
                      name="Marcus Chen"
                      meta="RN · 5 yrs"
                      status="eligible"
                      note="2 credentials verified"
                    />
                    <CandidateRow
                      name="Peter Adams"
                      meta="RN · 2 yrs"
                      status="ineligible"
                      note="Missing: ACLS"
                    />
                  </ul>
                </div>

                {/* Action footer */}
                <div className="mt-6 flex items-center justify-between border-t border-line-soft pt-5 gap-3">
                  <div className="text-xs text-muted">
                    Credential snapshot saved on assignment
                  </div>
                  <button className="btn-ink py-2.5 px-5 text-xs shrink-0">
                    Propose assignment
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT satellite — Snapshot */}
            <div
              className="lg:col-span-3 rise-sm order-3"
              style={{ animationDelay: "1.1s" }}
            >
              <div
                className="surface p-5 lg:transform lg:rotate-1"
                style={{ transformOrigin: "center" }}
              >
                <div className="eyebrow mb-2">Snapshot · immutable</div>
                <p className="text-sm text-ink leading-relaxed">
                  Every assignment captures the exact credential state at that
                  moment — for audits, forever.
                </p>
                <div className="mt-3 pt-3 border-t border-line-soft">
                  <div className="mono text-[10px] text-mute2 leading-relaxed">
                    <div>checkedAt: 2026-04-28T19:00Z</div>
                    <div>verified: 2 credentials</div>
                    <div>missing: []</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CandidateRow({
  name,
  meta,
  status,
  note,
  emphasis = false,
}: {
  name: string;
  meta: string;
  status: "eligible" | "ineligible";
  note: string;
  emphasis?: boolean;
}) {
  const eligible = status === "eligible";
  return (
    <li
      className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 transition-colors"
      style={{
        background: eligible
          ? "var(--color-accent-bg)"
          : "var(--color-danger-bg)",
        ...(emphasis && {
          boxShadow: `inset 0 0 0 1px var(--color-accent)`,
        }),
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <Avatar name={name} eligible={eligible} />
        <div className="min-w-0">
          <div className="text-sm font-medium text-ink truncate">{name}</div>
          <div className="text-xs text-muted truncate">{meta}</div>
        </div>
      </div>
      <div className="text-right shrink-0">
        <div
          className={`text-[11px] font-medium ${
            eligible ? "text-accent" : "text-danger"
          }`}
        >
          {eligible ? "✓ Eligible" : "✕ Blocked"}
        </div>
        <div className="text-[11px] text-muted">{note}</div>
      </div>
    </li>
  );
}

function Avatar({ name, eligible }: { name: string; eligible: boolean }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
  return (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium shrink-0"
      style={{
        background: "white",
        color: "var(--color-ink)",
        border: `1px solid ${
          eligible ? "var(--color-accent)" : "var(--color-danger)"
        }`,
      }}
    >
      {initials}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      className="shrink-0"
    >
      <circle
        cx="7"
        cy="7"
        r="6.25"
        stroke="var(--color-accent)"
        strokeWidth="1.2"
      />
      <path
        d="M4 7.5l2 2 4-4.5"
        stroke="var(--color-accent)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DottedRail() {
  return (
    <svg
      className="absolute inset-x-0 top-1/2 -translate-y-1/2 hidden lg:block pointer-events-none"
      width="100%"
      height="2"
      preserveAspectRatio="none"
      aria-hidden
    >
      <line
        x1="0"
        y1="1"
        x2="100%"
        y2="1"
        stroke="var(--color-line)"
        strokeDasharray="2 6"
        strokeWidth="1"
      />
    </svg>
  );
}
