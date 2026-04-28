import { SectionHeader } from "./HowItWorks";

export function Features() {
  return (
    <section id="features" className="section">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeader
          eyebrow="What makes it different"
          title="Compliance is the default, not an afterthought."
          subtitle="Three things that separate MedCred from a generic staffing portal."
        />

        <div className="mt-14 grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Big feature card — left, takes 3 cols */}
          <div className="surface lg:col-span-3 p-8 md:p-10 flex flex-col">
            <CredentialEngineGraphic />
            <div className="mt-8">
              <span className="chip chip-accent">The marquee feature</span>
              <h3 className="display text-3xl mt-4 text-ink">
                Credential-aware matching
              </h3>
              <p className="mt-3 text-muted leading-relaxed max-w-[44ch]">
                Every shift specifies role and credential requirements. Every
                match runs the same engine: type → credentials → expiry →
                schedule. Ineligibility is shown with the specific reason — no
                overrides, no surprises.
              </p>
            </div>
          </div>

          {/* Two stacked cards — right, take 2 cols */}
          <div className="lg:col-span-2 grid grid-rows-2 gap-5">
            <div className="surface p-7 flex flex-col justify-between">
              <SnapshotGraphic />
              <div className="mt-6">
                <h3 className="display text-2xl text-ink">
                  Immutable compliance snapshots
                </h3>
                <p className="mt-2 text-sm text-muted leading-relaxed">
                  At assignment time, the credential check is captured as JSON
                  and frozen. Audit-ready, forever.
                </p>
              </div>
            </div>

            <div className="surface p-7 flex flex-col justify-between">
              <RolesGraphic />
              <div className="mt-6">
                <h3 className="display text-2xl text-ink">
                  Multi-role workforce
                </h3>
                <p className="mt-2 text-sm text-muted leading-relaxed">
                  RNs, LPNs, CNAs, RTs, MAs. One platform, role-specific
                  baselines, shift-specific extras.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Bespoke illustrations (no icon library) ───────────────────────

function CredentialEngineGraphic() {
  // A stylized "engine" — three credential cards flowing into a shift slot,
  // with a diagonal verification beam. Inline SVG so we control every line.
  return (
    <svg viewBox="0 0 480 200" className="w-full h-auto" aria-hidden>
      {/* Background grid lines */}
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path
            d="M 20 0 L 0 0 0 20"
            fill="none"
            stroke="var(--color-line-soft)"
            strokeWidth="0.5"
          />
        </pattern>
        <linearGradient id="beam" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0" />
          <stop
            offset="50%"
            stopColor="var(--color-accent)"
            stopOpacity="0.5"
          />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="480" height="200" fill="url(#grid)" opacity="0.6" />

      {/* Three credential cards on the left */}
      <g transform="translate(20, 30)">
        <CredCard x={0} y={0} label="RN License" />
        <CredCard x={0} y={50} label="BLS Cert" />
        <CredCard x={0} y={100} label="ACLS Cert" />
      </g>

      {/* Connecting beam */}
      <line
        x1="160"
        y1="100"
        x2="320"
        y2="100"
        stroke="url(#beam)"
        strokeWidth="2"
        strokeDasharray="2 4"
      />

      {/* Engine — a hexagonal abstraction in the middle */}
      <g transform="translate(220, 70)">
        <polygon
          points="30,0 55,15 55,45 30,60 5,45 5,15"
          fill="var(--color-card)"
          stroke="var(--color-ink)"
          strokeWidth="1.25"
        />
        <text
          x="30"
          y="35"
          textAnchor="middle"
          fontSize="9"
          fontFamily="var(--font-mono)"
          fill="var(--color-ink)"
        >
          ENGINE
        </text>
      </g>

      {/* Shift card on the right with a green checkmark */}
      <g transform="translate(340, 60)">
        <rect width="120" height="80" rx="10" fill="var(--color-ink)" />
        <text
          x="14"
          y="28"
          fontSize="10"
          fontFamily="var(--font-mono)"
          fill="var(--color-mute-2)"
          letterSpacing="1"
        >
          SHIFT
        </text>
        <text
          x="14"
          y="48"
          fontSize="13"
          fontFamily="var(--font-display)"
          fill="white"
        >
          ICU · Night
        </text>
        <text x="14" y="65" fontSize="10" fill="var(--color-mute-2)">
          Nora R. · matched
        </text>
        <circle cx="100" cy="20" r="9" fill="var(--color-accent)" />
        <path
          d="M96 20 l3 3 5-5"
          stroke="white"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

function CredCard({ x, y, label }: { x: number; y: number; label: string }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect
        width="140"
        height="38"
        rx="6"
        fill="var(--color-card)"
        stroke="var(--color-line)"
        strokeWidth="1"
      />
      <circle
        cx="16"
        cy="19"
        r="6"
        fill="var(--color-accent-bg)"
        stroke="var(--color-accent)"
        strokeWidth="1"
      />
      <path
        d="M13 19 l2.5 2.5 5-5"
        stroke="var(--color-accent)"
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text
        x="30"
        y="23"
        fontSize="11"
        fontFamily="var(--font-body)"
        fontWeight="500"
        fill="var(--color-ink)"
      >
        {label}
      </text>
    </g>
  );
}

function SnapshotGraphic() {
  return (
    <svg viewBox="0 0 200 90" className="w-full h-auto" aria-hidden>
      {/* A stylized JSON-looking document with a lock seal */}
      <rect
        x="10"
        y="10"
        width="140"
        height="70"
        rx="6"
        fill="var(--color-bg)"
        stroke="var(--color-line)"
        strokeWidth="1"
      />

      {/* Faint code lines */}
      <line
        x1="22"
        y1="22"
        x2="80"
        y2="22"
        stroke="var(--color-mute-2)"
        strokeWidth="2"
        opacity="0.3"
      />
      <line
        x1="22"
        y1="32"
        x2="120"
        y2="32"
        stroke="var(--color-mute-2)"
        strokeWidth="2"
        opacity="0.3"
      />
      <line
        x1="22"
        y1="42"
        x2="100"
        y2="42"
        stroke="var(--color-mute-2)"
        strokeWidth="2"
        opacity="0.3"
      />
      <line
        x1="22"
        y1="52"
        x2="140"
        y2="52"
        stroke="var(--color-mute-2)"
        strokeWidth="2"
        opacity="0.3"
      />
      <line
        x1="22"
        y1="62"
        x2="90"
        y2="62"
        stroke="var(--color-mute-2)"
        strokeWidth="2"
        opacity="0.3"
      />

      {/* Lock seal — overlapping the document */}
      <circle cx="160" cy="65" r="20" fill="var(--color-ink)" />
      <rect x="153" y="60" width="14" height="10" rx="1.5" fill="white" />
      <path
        d="M156 60 v-4 a4 4 0 0 1 8 0 v4"
        stroke="white"
        strokeWidth="1.5"
        fill="none"
      />
    </svg>
  );
}

function RolesGraphic() {
  // Five overlapping role chips — different sizes for visual rhythm
  return (
    <svg viewBox="0 0 200 90" className="w-full h-auto" aria-hidden>
      <RoleChip x={10} y={20} w={50} label="RN" highlight />
      <RoleChip x={56} y={42} w={50} label="LPN" />
      <RoleChip x={102} y={20} w={50} label="CNA" />
      <RoleChip x={130} y={50} w={50} label="RT" />
      <RoleChip x={20} y={56} w={45} label="MA" />
    </svg>
  );
}

function RoleChip({
  x,
  y,
  w,
  label,
  highlight = false,
}: {
  x: number;
  y: number;
  w: number;
  label: string;
  highlight?: boolean;
}) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect
        width={w}
        height="22"
        rx="11"
        fill={highlight ? "var(--color-ink)" : "var(--color-card)"}
        stroke={highlight ? "var(--color-ink)" : "var(--color-line)"}
        strokeWidth="1"
      />
      <text
        x={w / 2}
        y="15"
        textAnchor="middle"
        fontSize="10"
        fontWeight="500"
        fontFamily="var(--font-mono)"
        fill={highlight ? "white" : "var(--color-ink)"}
      >
        {label}
      </text>
    </g>
  );
}
