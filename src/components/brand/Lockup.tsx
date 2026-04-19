// src/components/brand/Lockup.tsx
// Brand lockup: a geometric monogram (medical cross worked into an M shape)
// paired with the wordmark. Used on public pages and could be reused
// in the app sidebar later.

type Props = {
  size?: "sm" | "md" | "lg";
  wordmark?: boolean;
  className?: string;
};

const SIZES = {
  sm: { icon: 20, textClass: "text-sm" },
  md: { icon: 24, textClass: "text-base" },
  lg: { icon: 32, textClass: "text-lg" },
};

export function Lockup({
  size = "md",
  wordmark = true,
  className = "",
}: Props) {
  const s = SIZES[size];

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        width={s.icon}
        height={s.icon}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="MedCred Workforce"
      >
        {/* Outer container square — suggests a credential badge */}
        <rect
          x="1"
          y="1"
          width="30"
          height="30"
          rx="3"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        {/* Medical cross, offset to form the negative space of an implied M */}
        <rect x="13.5" y="6" width="5" height="20" fill="currentColor" />
        <rect x="6" y="13.5" width="20" height="5" fill="currentColor" />
      </svg>

      {wordmark && (
        <span
          className={`font-semibold tracking-tight text-slate-900 ${s.textClass}`}
          style={{ fontFamily: "var(--font-serif)" }}
        >
          MedCred<span className="font-normal text-slate-500"> Workforce</span>
        </span>
      )}
    </div>
  );
}
