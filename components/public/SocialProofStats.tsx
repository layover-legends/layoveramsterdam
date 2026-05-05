type Props = {
  completedBookings: number;
};

const stats = (count: number) => [
  { value: "100%", label: "On-time return guarantee",  icon: "⏱" },
  { value: "✓",    label: "Verified bookings only",    icon: "🛡" },
  { value: `${Math.max(count, 1000).toLocaleString("en")}+`, label: "Happy travellers", icon: "✈" },
];

export default function SocialProofStats({ completedBookings }: Props) {
  return (
    <section className="py-16 px-5 border-b border-warm-cream/8">
      <div className="max-w-4xl mx-auto grid grid-cols-3 gap-4 text-center">
        {stats(completedBookings).map((s) => (
          <div key={s.label} className="space-y-2">
            <div className="text-2xl sm:text-3xl">{s.icon}</div>
            <div className="font-display text-3xl sm:text-5xl font-semibold text-legend-gold tracking-tight">
              {s.value}
            </div>
            <p className="text-xs sm:text-sm text-warm-cream/55 leading-snug max-w-[120px] mx-auto">
              {s.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
