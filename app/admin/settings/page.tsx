import { requireAdmin } from "@/lib/auth/require-admin";
import { getSiteSettings, upsertSettings } from "@/lib/admin/site-settings";
import { getUiStrings, t } from "@/lib/i18n/ui";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const SETTING_GROUPS: {
  title: string;
  keys: { key: string; label: string; type?: "text" | "url" | "tel" | "email" }[];
}[] = [
  {
    title: "Contact & identity",
    keys: [
      { key: "founder_name",    label: "Founder name" },
      { key: "contact_email",   label: "Contact email",  type: "email" },
      { key: "contact_phone",   label: "Contact phone",  type: "tel"   },
      { key: "kvk_number",      label: "KvK number" },
      { key: "vat_number",      label: "VAT number" },
    ],
  },
  {
    title: "Social media",
    keys: [
      { key: "social_instagram_url", label: "Instagram URL", type: "url" },
      { key: "social_tiktok_url",    label: "TikTok URL",    type: "url" },
      { key: "social_linkedin_url",  label: "LinkedIn URL",  type: "url" },
      { key: "social_facebook_url",  label: "Facebook URL",  type: "url" },
      { key: "social_youtube_url",   label: "YouTube URL",   type: "url" },
    ],
  },
  {
    title: "SEO & content",
    keys: [
      { key: "meta_description_en", label: "Homepage meta description (EN)" },
      { key: "press_kit_url",       label: "Press kit URL",   type: "url" },
    ],
  },
];

async function saveSettings(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const entries: Record<string, string | null> = {};
  for (const group of SETTING_GROUPS) {
    for (const { key } of group.keys) {
      const val = (formData.get(key) as string | null)?.trim() || null;
      entries[key] = val;
    }
  }
  await upsertSettings(entries, admin.id);

  const auditAdmin = createAdminClient();
  await auditAdmin.from("audit_logs").insert({
    user_id: admin.id, event_type: "setting_bulk_update", payload: { keys: Object.keys(entries) },
  });
  revalidatePath("/admin/settings");
  revalidatePath("/");
}

const WM_POSITIONS = [
  "northwest","north","northeast",
  "west",     "center","east",
  "southwest","south", "southeast",
] as const;

const WM_SOURCES: { value: string; label: string }[] = [
  { value: "tour",            label: "Tours" },
  { value: "addon",           label: "Add-ons" },
  { value: "destination",     label: "Destinations" },
  { value: "marketing",       label: "Marketing" },
  { value: "about",           label: "About page" },
  { value: "staff",           label: "Staff" },
  { value: "vehicle",         label: "Vehicles" },
];

async function saveWatermarkSettings(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const enabledSources = WM_SOURCES
    .map((s) => s.value)
    .filter((v) => formData.get(`wm_source_${v}`) === "on");

  const entries: Record<string, string | null> = {
    watermark_default_enabled:  formData.get("wm_enabled") === "on" ? "true" : "false",
    watermark_default_position: (formData.get("wm_position") as string) || "southeast",
    watermark_default_opacity:  (formData.get("wm_opacity")  as string) || "60",
    watermark_sources_enabled:  enabledSources.join(","),
  };
  await upsertSettings(entries, admin.id);
  revalidatePath("/admin/settings");
}

export default async function AdminSettingsPage({ searchParams }: { searchParams?: { saved?: string } }) {
  await requireAdmin();
  const [settings, s] = await Promise.all([getSiteSettings(), getUiStrings()]);
  const saved = searchParams?.saved === "1";

  return (
    <div className="space-y-6 max-w-2xl">
      <header>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold">Site settings</h1>
        <p className="text-sm text-warm-cream/60 mt-1">
          Values here appear in the footer, contact page, and SEO metadata without a code deploy.
        </p>
      </header>

      {saved && (
        <div role="status" className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          {t(s, "admin.common.saved", "Saved.")}
        </div>
      )}

      <form action={saveSettings} className="space-y-8">
        {SETTING_GROUPS.map((group) => (
          <section key={group.title} className="space-y-4">
            <h2 className="text-sm font-semibold text-legend-gold uppercase tracking-wide">{group.title}</h2>
            <div className="space-y-3">
              {group.keys.map(({ key, label, type = "text" }) => (
                <div key={key} className="space-y-1.5">
                  <label htmlFor={key} className="block text-xs font-medium text-warm-cream/70 uppercase tracking-wide">
                    {label}
                  </label>
                  <input id={key} name={key} type={type}
                    defaultValue={settings[key] ?? ""}
                    placeholder={type === "url" ? "https://…" : ""}
                    className="w-full px-3 py-2 rounded-xl bg-warm-cream/5 border border-warm-cream/15 text-warm-cream text-sm placeholder:text-warm-cream/20 focus:outline-none focus:ring-2 focus:ring-legend-gold/40" />
                </div>
              ))}
            </div>
          </section>
        ))}

        <button type="submit"
          className="px-6 py-2.5 rounded-full bg-legend-gold text-ink-black font-semibold text-sm hover:bg-gold-light transition-colors">
          {t(s, "common.save_changes", "Save all settings")}
        </button>
      </form>

      {/* ── Watermark defaults ──────────────────────────────────────────── */}
      <section className="space-y-4 border-t border-warm-cream/10 pt-6">
        <div>
          <h2 className="text-sm font-semibold text-legend-gold uppercase tracking-wide">Watermark</h2>
          <p className="text-xs text-warm-cream/50 mt-1">
            Applied to new uploads automatically. Individual uploads can override via the PhotoUploader toggle.
            <br />review + customer_upload sources never receive a watermark regardless of these settings.
          </p>
        </div>

        <form action={saveWatermarkSettings} className="space-y-5">
          {/* Enable toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" name="wm_enabled"
              defaultChecked={settings.watermark_default_enabled !== "false"}
              className="w-4 h-4 rounded accent-legend-gold" />
            <span className="text-sm text-warm-cream/80">Enable watermarking by default</span>
          </label>

          {/* Position */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-warm-cream/60 uppercase tracking-wide">
              Default position
            </label>
            <div className="grid grid-cols-3 gap-1 w-48">
              {WM_POSITIONS.map((pos) => (
                <label key={pos} className="flex items-center gap-1.5 cursor-pointer text-xs text-warm-cream/70">
                  <input type="radio" name="wm_position" value={pos}
                    defaultChecked={(settings.watermark_default_position ?? "southeast") === pos}
                    className="accent-legend-gold" />
                  {pos}
                </label>
              ))}
            </div>
          </div>

          {/* Opacity */}
          <div className="space-y-1.5">
            <label htmlFor="wm_opacity" className="block text-xs font-medium text-warm-cream/60 uppercase tracking-wide">
              Default opacity (1–100)
            </label>
            <input id="wm_opacity" name="wm_opacity" type="number" min="1" max="100"
              defaultValue={settings.watermark_default_opacity ?? "60"}
              className="w-24 px-3 py-2 rounded-xl bg-warm-cream/5 border border-warm-cream/15 text-warm-cream text-sm focus:outline-none focus:ring-2 focus:ring-legend-gold/40" />
          </div>

          {/* Sources */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-warm-cream/60 uppercase tracking-wide">
              Apply watermark by default for these sources
            </p>
            <div className="flex flex-wrap gap-3">
              {WM_SOURCES.map(({ value, label }) => {
                const enabledList = (settings.watermark_sources_enabled ?? "tour,destination,marketing,about")
                  .split(",").map((s) => s.trim());
                return (
                  <label key={value} className="flex items-center gap-2 cursor-pointer text-sm text-warm-cream/70">
                    <input type="checkbox" name={`wm_source_${value}`}
                      defaultChecked={enabledList.includes(value)}
                      className="accent-legend-gold" />
                    {label}
                  </label>
                );
              })}
            </div>
          </div>

          <button type="submit"
            className="px-5 py-2 rounded-full bg-legend-gold text-ink-black font-semibold text-sm hover:bg-gold-light transition-colors">
            Save watermark defaults
          </button>
        </form>
      </section>
    </div>
  );
}
