type Props = {
  label: string;
  value: string | number;
  hint?: string;
  accent?: "default" | "orange" | "emerald";
};

const ACCENTS: Record<NonNullable<Props["accent"]>, string> = {
  default: "border-brand-cream/10",
  orange: "border-brand-orange/40",
  emerald: "border-emerald-400/40",
};

export default function MetricCard({ label, value, hint, accent = "default" }: Props) {
  return (
    <div
      className={`rounded-2xl border ${ACCENTS[accent]} bg-brand-cream/5 p-5 flex flex-col gap-1`}
    >
      <p className="text-xs uppercase tracking-wide text-brand-cream/55">{label}</p>
      <p className="text-3xl font-bold tracking-tight">{value}</p>
      {hint && <p className="text-xs text-brand-cream/50">{hint}</p>}
    </div>
  );
}
