import { requireAdmin } from "@/lib/auth/require-admin";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Data Processors · Admin",
  robots: { index: false },
};

type Processor = {
  name: string;
  role: string;
  dataShared: string[];
  dpaStatus: "signed" | "standard-clauses" | "pending" | "not-required";
  dpaLink?: string;
  privacyLink: string;
  retentionPeriod: string;
  region: string;
};

const PROCESSORS: Processor[] = [
  {
    name: "Supabase",
    role: "Database, authentication, file storage",
    dataShared: ["User profiles", "Bookings", "Layovers", "All application data"],
    dpaStatus: "standard-clauses",
    dpaLink: "https://supabase.com/docs/guides/platform/gdpr",
    privacyLink: "https://supabase.com/privacy",
    retentionPeriod: "Duration of service + 30 days post-deletion",
    region: "EU (AWS eu-west-1, Ireland)",
  },
  {
    name: "Stripe",
    role: "Payment processing",
    dataShared: ["Customer name", "Email", "Payment method data", "Transaction amounts"],
    dpaStatus: "standard-clauses",
    dpaLink: "https://stripe.com/legal/dpa",
    privacyLink: "https://stripe.com/privacy",
    retentionPeriod: "7 years (PCI DSS + tax obligations)",
    region: "EU data residency available; default US with SCCs",
  },
  {
    name: "Resend",
    role: "Transactional email delivery",
    dataShared: ["Recipient email address", "Email content (booking details)", "Delivery status"],
    dpaStatus: "standard-clauses",
    dpaLink: "https://resend.com/legal/dpa",
    privacyLink: "https://resend.com/legal/privacy-policy",
    retentionPeriod: "30 days (logs), then deleted",
    region: "US (with SCCs for EU transfers)",
  },
  {
    name: "Vercel",
    role: "Application hosting, edge functions, CDN",
    dataShared: ["Request logs (IP, user-agent)", "Application errors"],
    dpaStatus: "standard-clauses",
    dpaLink: "https://vercel.com/legal/dpa",
    privacyLink: "https://vercel.com/legal/privacy-policy",
    retentionPeriod: "30 days (logs)",
    region: "EU edge nodes + US origin (SCCs)",
  },
  {
    name: "Mapbox",
    role: "Map rendering on tour pages",
    dataShared: ["Tile requests (no user PII sent)", "IP address (server-side requests only)"],
    dpaStatus: "not-required",
    privacyLink: "https://www.mapbox.com/legal/privacy",
    retentionPeriod: "Not applicable (tile requests only)",
    region: "US",
  },
  {
    name: "DeepL",
    role: "Automated translation of destination/tour content",
    dataShared: ["Destination names and descriptions (no user PII)"],
    dpaStatus: "standard-clauses",
    dpaLink: "https://www.deepl.com/pro-data-security",
    privacyLink: "https://www.deepl.com/privacy",
    retentionPeriod: "Text deleted immediately after translation (no storage)",
    region: "EU (Germany)",
  },
  {
    name: "Cloudflare",
    role: "DNS, DDoS protection, SSL termination",
    dataShared: ["IP addresses (in transit)", "Request metadata"],
    dpaStatus: "standard-clauses",
    dpaLink: "https://www.cloudflare.com/cloudflare-customer-dpa/",
    privacyLink: "https://www.cloudflare.com/privacypolicy/",
    retentionPeriod: "24–48 hours (logs)",
    region: "EU nodes available; global CDN",
  },
  {
    name: "Google (OAuth)",
    role: "Sign-in authentication only",
    dataShared: ["Name, email, profile picture from Google account (on sign-in)"],
    dpaStatus: "standard-clauses",
    dpaLink: "https://cloud.google.com/terms/data-processing-addendum",
    privacyLink: "https://policies.google.com/privacy",
    retentionPeriod: "OAuth tokens expire; we store only name + email in our DB",
    region: "Global (Google infrastructure)",
  },
];

const DPA_BADGE: Record<Processor["dpaStatus"], { label: string; color: string }> = {
  "signed": { label: "DPA signed", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30" },
  "standard-clauses": { label: "Standard contractual clauses", color: "text-legend-gold bg-legend-gold/10 border-legend-gold/30" },
  "pending": { label: "DPA pending", color: "text-orange-400 bg-orange-400/10 border-orange-400/30" },
  "not-required": { label: "Not required", color: "text-warm-cream/50 bg-warm-cream/5 border-warm-cream/10" },
};

export default async function ProcessorsPage() {
  await requireAdmin();

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="font-display text-2xl sm:text-3xl font-semibold">Data Processors</h1>
        <p className="text-sm text-warm-cream/60">
          GDPR Art. 28 — Record of all third-party processors that handle personal data on behalf of Layover Legends.
          Review and sign/update DPAs before going live with paying customers.
        </p>
      </header>

      <div className="rounded-xl border border-legend-gold/20 bg-legend-gold/5 px-5 py-4 text-sm text-warm-cream/75 space-y-1">
        <p className="font-semibold text-warm-cream/90">TODO for lawyer review before launch:</p>
        <ul className="list-disc list-inside pl-1 space-y-0.5">
          <li>Verify each processor&apos;s DPA covers EU-to-non-EU transfers (SCCs or adequacy decision)</li>
          <li>Sign explicit DPA with Stripe for payment processing (they have a self-serve flow)</li>
          <li>Add this record to the company Record of Processing Activities (RoPA — GDPR Art. 30)</li>
          <li>Review annually or when a processor changes data handling practices</li>
        </ul>
      </div>

      <div className="space-y-4">
        {PROCESSORS.map((p) => {
          const badge = DPA_BADGE[p.dpaStatus];
          return (
            <div
              key={p.name}
              className="rounded-xl border border-warm-cream/10 bg-warm-cream/3 p-5 space-y-3"
            >
              <div className="flex flex-wrap items-start gap-3 justify-between">
                <div>
                  <h2 className="font-semibold text-lg">{p.name}</h2>
                  <p className="text-sm text-warm-cream/60">{p.role}</p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${badge.color}`}>
                  {badge.label}
                </span>
              </div>

              <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div>
                  <dt className="text-warm-cream/40 text-xs uppercase tracking-wide mb-0.5">Data shared</dt>
                  <dd className="text-warm-cream/75">
                    <ul className="list-disc list-inside space-y-0.5 pl-1">
                      {p.dataShared.map((d) => <li key={d}>{d}</li>)}
                    </ul>
                  </dd>
                </div>
                <div className="space-y-3">
                  <div>
                    <dt className="text-warm-cream/40 text-xs uppercase tracking-wide mb-0.5">Retention</dt>
                    <dd className="text-warm-cream/75">{p.retentionPeriod}</dd>
                  </div>
                  <div>
                    <dt className="text-warm-cream/40 text-xs uppercase tracking-wide mb-0.5">Region</dt>
                    <dd className="text-warm-cream/75">{p.region}</dd>
                  </div>
                </div>
              </dl>

              <div className="flex gap-4 pt-1 text-xs">
                <a
                  href={p.privacyLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-canal-light hover:text-canal-blue transition-colors"
                >
                  Privacy policy ↗
                </a>
                {p.dpaLink && (
                  <a
                    href={p.dpaLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-legend-gold hover:text-gold-light transition-colors"
                  >
                    DPA / Data security ↗
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <footer className="text-xs text-warm-cream/30 pt-4 border-t border-warm-cream/10 space-y-1">
        <p>Last reviewed: 2026-05-03 · Layover Legends eenmanszaak · Amsterdam, NL</p>
        <p>Contact for data requests: travellayoverlegends@gmail.com</p>
        <p>Supervisory authority: Autoriteit Persoonsgegevens · autoriteitpersoonsgegevens.nl</p>
      </footer>
    </div>
  );
}
