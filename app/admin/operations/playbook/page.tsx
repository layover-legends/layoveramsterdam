import { requireAdmin } from "@/lib/auth/require-admin";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Crisis Playbook · Admin" };

const SCENARIOS = [
  {
    id: "customer-no-show",
    icon: "👤",
    title: "Customer no-show",
    steps: [
      "Wait 30 minutes past the scheduled pickup time.",
      "Attempt 3 calls to the customer's registered phone number at 10-minute intervals.",
      "If no response, mark the assignment as 'No-show' in the roster.",
      "Send a courtesy email/SMS: 'We waited but couldn't reach you. Please contact us to rebook.'",
      "Per cancellation policy: no refund within 24h of tour start. Apply this automatically.",
      "Log the incident in the booking notes.",
    ],
  },
  {
    id: "flight-delayed",
    icon: "✈️",
    title: "Customer late arrival (flight delayed)",
    steps: [
      "Monitor flight status in real-time via FlightAware (flight number is in the booking).",
      "If delay is under 30 minutes: wait at pickup point, adjust route to fit remaining time.",
      "If delay is 30–90 minutes: contact admin immediately to assess whether a shortened tour is possible.",
      "If delay is over 90 minutes: offer a full refund or same-day rebook if slots available.",
      "Never let the customer miss their departure flight — always pad at least 2h before their gate.",
    ],
  },
  {
    id: "vehicle-breakdown",
    icon: "🚗",
    title: "Vehicle breakdown mid-tour",
    steps: [
      "Ensure passengers are safe and off the road if required.",
      "Call roadside assistance: policy number is on the vehicle record in the admin.",
      "Notify admin immediately with location, vehicle, and estimated wait.",
      "Admin will arrange: (a) alternate vehicle, (b) public transit assistance, or (c) tour cancellation with full refund.",
      "Do not leave customers stranded. Stay with them until resolved.",
      "Document everything in the assignment notes for insurance purposes.",
    ],
  },
  {
    id: "medical-emergency",
    icon: "🚑",
    title: "Customer medical emergency",
    steps: [
      "Call 112 immediately (NL emergency: police, ambulance, fire).",
      "Stay with the customer and follow dispatcher instructions.",
      "Note the nearest hospital: Amsterdam UMC (+31 20 444 9111) or OLVG (+31 20 599 9111).",
      "Ask another customer or bystander to guide the ambulance to you.",
      "Notify admin as soon as the patient is in medical care.",
      "Collect customer's emergency contact info from the booking (if provided).",
      "File an incident report in the booking notes within 24h.",
    ],
  },
  {
    id: "lost-passport",
    icon: "🛂",
    title: "Customer lost passport or wallet",
    steps: [
      "Check the immediate vicinity — most items are found quickly.",
      "Contact the last venue visited (museum, restaurant) — many hold items.",
      "Direct the customer to the nearest police station to file a report (required for insurance).",
      "For passports: contact the customer's nearest consulate in Amsterdam.",
      "Common consulates: US (+31 70 310 2209), UK (+31 70 427 0427), French (+31 70 312 5800).",
      "Document all steps taken in the booking notes.",
    ],
  },
  {
    id: "bad-weather",
    icon: "🌧️",
    title: "Bad weather (storm, heavy rain)",
    steps: [
      "Light rain: tours run as normal. Umbrellas provided to guests.",
      "Moderate rain: adapt route to include more indoor stops (Rijksmuseum lobby, covered markets).",
      "Storm warning (KNMI code orange or red): postpone outdoor portions. Contact customers 2h in advance.",
      "If customer requests cancellation due to weather: offer reschedule or 50% refund (our policy).",
      "Lightning or extreme wind: abort tour immediately, return to covered shelter.",
      "Never pressure a customer to continue in unsafe conditions.",
    ],
  },
  {
    id: "aggressive-customer",
    icon: "⚠️",
    title: "Customer aggressive or intoxicated",
    steps: [
      "Remain calm. Lower your voice. Avoid escalating language.",
      "Establish clear, firm boundaries: 'This behavior is not acceptable on our tour.'",
      "If verbal: give one clear warning, then offer to end the tour and call a taxi.",
      "If physical threat: move away, call 112 (police). Your safety first, always.",
      "Never argue. De-escalation beats confrontation.",
      "After the incident: document everything in the booking notes. Admin may issue a ban.",
    ],
  },
  {
    id: "fraud-booking",
    icon: "💳",
    title: "Suspected fraud booking",
    steps: [
      "Signs: very recent signup, unusual party size, strange booking pattern.",
      "Do not charge the customer anything extra or act suspiciously toward them.",
      "Flag the booking in the admin and mark for review.",
      "If Stripe dispute received: gather evidence (booking logs, assignment notes, photos).",
      "Respond to the dispute within 7 days with all evidence.",
      "Contact Stripe support if the pattern repeats (potential card testing).",
    ],
  },
  {
    id: "driver-sick",
    icon: "🤒",
    title: "Driver no-show or sick day",
    steps: [
      "Driver must notify admin as soon as possible — ideally 4h before the tour.",
      "Admin checks roster for available backup driver (check max_tours_per_day constraint).",
      "If no backup available: contact customers immediately to reschedule or refund.",
      "For confirmed bookings: full refund offered for operator-side cancellations.",
      "Document in the staff record to track patterns.",
    ],
  },
  {
    id: "lost-found",
    icon: "🔍",
    title: "Lost & found",
    steps: [
      "Found items go in a labeled bag in the driver's car until end of day.",
      "Log the item (description, date, vehicle) in the booking notes.",
      "Contact the customer the same day by email/phone.",
      "Hold items for 30 days. After 30 days: donate (clothing) or dispose (perishables).",
      "For high-value items (phone, jewelry, documents): contact police if customer unreachable.",
      "Shipping costs for returning items are at the customer's expense.",
    ],
  },
];

export default async function PlaybookPage() {
  await requireAdmin();

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="font-display text-2xl sm:text-3xl font-semibold">Crisis Playbook</h1>
        <p className="text-sm text-warm-cream/60 max-w-xl">
          Quick-reference protocols for every situation you may encounter on tour.
          Read these when things are calm — not when they're on fire.
        </p>
      </header>

      <div className="rounded-xl border border-legend-gold/20 bg-legend-gold/5 px-5 py-4 text-sm text-warm-cream/75">
        <strong className="text-warm-cream/90">Emergency numbers (NL):</strong>{" "}
        Police / Fire / Ambulance: <strong>112</strong> ·
        Amsterdam UMC: <strong>+31 20 444 9111</strong> ·
        OLVG Hospital: <strong>+31 20 599 9111</strong> ·
        Admin: <strong>travellayoverlegends@gmail.com</strong>
      </div>

      <div className="grid gap-6">
        {SCENARIOS.map((s) => (
          <details key={s.id} className="rounded-2xl border border-warm-cream/10 overflow-hidden">
            <summary className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-warm-cream/[0.03] transition-colors list-none">
              <span className="text-xl">{s.icon}</span>
              <span className="font-semibold text-warm-cream/90">{s.title}</span>
              <span className="ml-auto text-warm-cream/30 text-sm">▼</span>
            </summary>
            <div className="px-5 pb-5 border-t border-warm-cream/8">
              <ol className="mt-4 space-y-2">
                {s.steps.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm text-warm-cream/75 leading-relaxed">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-legend-gold/15 text-legend-gold text-xs flex items-center justify-center font-medium mt-0.5">
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </details>
        ))}
      </div>

      <p className="text-xs text-warm-cream/30 pt-2">
        Last reviewed: May 2026 · Keep this updated after every incident.
        Add new scenarios via the admin source file or request a content update.
      </p>
    </div>
  );
}
