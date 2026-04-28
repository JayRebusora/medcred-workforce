type Props = {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "warning" | "success" | "danger";
};

const TONE_CLASSES: Record<NonNullable<Props["tone"]>, string> = {
  default: "text-slate-900",
  warning: "text-amber-700",
  success: "text-emerald-700",
  danger: "text-red-700",
};

export function StatCard({ label, value, hint, tone = "default" }: Props) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p
        className={`mt-2 text-3xl font-semibold tracking-tight ${TONE_CLASSES[tone]}`}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
