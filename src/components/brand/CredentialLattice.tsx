type CredentialState = "approved" | "pending" | "expired" | "empty";

// Deterministic pattern — not random so it looks intentional.
// Reading it top-to-bottom, left-to-right roughly tells a story of a
// workforce: lots of approved, some pending, a few expired.
const PATTERN: CredentialState[][] = [
  [
    "approved",
    "approved",
    "pending",
    "approved",
    "empty",
    "approved",
    "approved",
    "approved",
  ],
  [
    "approved",
    "empty",
    "approved",
    "approved",
    "approved",
    "pending",
    "approved",
    "approved",
  ],
  [
    "pending",
    "approved",
    "approved",
    "expired",
    "approved",
    "approved",
    "empty",
    "approved",
  ],
  [
    "approved",
    "approved",
    "approved",
    "approved",
    "pending",
    "approved",
    "approved",
    "approved",
  ],
  [
    "approved",
    "empty",
    "pending",
    "approved",
    "approved",
    "approved",
    "approved",
    "empty",
  ],
  [
    "approved",
    "approved",
    "approved",
    "approved",
    "empty",
    "approved",
    "expired",
    "approved",
  ],
  [
    "empty",
    "approved",
    "approved",
    "pending",
    "approved",
    "approved",
    "approved",
    "approved",
  ],
  [
    "approved",
    "approved",
    "approved",
    "approved",
    "approved",
    "empty",
    "approved",
    "pending",
  ],
];

type Props = {
  className?: string;
  /** Overlay a subtle fade to blend into surrounding background */
  fade?: boolean;
};

export function CredentialLattice({ className = "", fade = false }: Props) {
  const CELL = 36;
  const GAP = 6;
  const COLS = PATTERN[0].length;
  const ROWS = PATTERN.length;
  const W = COLS * CELL + (COLS - 1) * GAP;
  const H = ROWS * CELL + (ROWS - 1) * GAP;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        {/* Diagonal hatch pattern for "expired" cells */}
        <pattern
          id="cred-expired-hatch"
          width="6"
          height="6"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="6"
            stroke="#94a3b8"
            strokeWidth="1.5"
          />
        </pattern>
        {fade && (
          <linearGradient id="cred-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="white" stopOpacity="0" />
            <stop offset="1" stopColor="white" stopOpacity="1" />
          </linearGradient>
        )}
      </defs>

      {PATTERN.map((row, ri) =>
        row.map((cell, ci) => {
          const x = ci * (CELL + GAP);
          const y = ri * (CELL + GAP);

          if (cell === "empty") return null;

          if (cell === "approved") {
            return (
              <rect
                key={`${ri}-${ci}`}
                x={x}
                y={y}
                width={CELL}
                height={CELL}
                rx="3"
                fill="#0f172a"
              />
            );
          }
          if (cell === "pending") {
            return (
              <rect
                key={`${ri}-${ci}`}
                x={x + 0.5}
                y={y + 0.5}
                width={CELL - 1}
                height={CELL - 1}
                rx="3"
                fill="none"
                stroke="#475569"
                strokeWidth="1"
              />
            );
          }
          if (cell === "expired") {
            return (
              <g key={`${ri}-${ci}`}>
                <rect
                  x={x + 0.5}
                  y={y + 0.5}
                  width={CELL - 1}
                  height={CELL - 1}
                  rx="3"
                  fill="url(#cred-expired-hatch)"
                  stroke="#94a3b8"
                  strokeWidth="1"
                />
              </g>
            );
          }
          return null;
        }),
      )}

      {fade && <rect x="0" y="0" width={W} height={H} fill="url(#cred-fade)" />}
    </svg>
  );
}
