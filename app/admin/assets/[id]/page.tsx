import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPhotoUsage } from "@/lib/photos/usage";
import { getUiStrings, t } from "@/lib/i18n/ui";
import { revalidatePath } from "next/cache";
import DeleteAssetButton from "@/components/admin/DeleteAssetButton";

export const dynamic = "force-dynamic";

const LICENSE_OPTIONS = [
  "owned","royalty_free","unsplash","creative_commons","licensed","unknown"
];
const MOD_OPTIONS = ["auto_approved","pending_review","approved","rejected"];
const CROP_OPTIONS = ["attention","entropy","center","manual_focal"];

async function saveAsset(formData: FormData) {
  "use server";
  const admin_ = await requireAdmin();
  const id = formData.get("id") as string;
  const admin = createAdminClient();

  const updates: Record<string, unknown> = {
    alt_text:          ((formData.get("alt_text") as string) || "").trim(),
    caption:           ((formData.get("caption")  as string) || "").trim() || null,
    tags:              ((formData.get("tags") as string) || "").split(",").map((t) => t.trim()).filter(Boolean),
    copyright_holder:  ((formData.get("copyright_holder") as string) || "").trim() || null,
    license_type:      formData.get("license_type") as string || null,
    license_expires_at:((formData.get("license_expires_at") as string) || "").trim() || null,
    photographer_credit:((formData.get("photographer_credit") as string) || "").trim() || null,
    license_notes:     ((formData.get("license_notes") as string) || "").trim() || null,
    moderation_status: formData.get("moderation_status") as string,
    moderation_notes:  ((formData.get("moderation_notes") as string) || "").trim() || null,
    nsfw_flag:         formData.get("nsfw_flag") === "true",
    is_featured:       formData.get("is_featured") === "true",
    is_public:         formData.get("is_public") !== "false",
    crop_strategy:     formData.get("crop_strategy") as string,
    updated_at:        new Date().toISOString(),
  };

  if (!updates.alt_text) {
    return; // Silently skip — form validation should catch this
  }

  await admin.from("photos").update(updates).eq("id", id);
  await admin.from("audit_logs").insert({
    user_id: admin_.id, event_type: "photo_updated",
    payload: { photo_id: id, alt_text: updates.alt_text },
  });
  revalidatePath(`/admin/assets/${id}`);
  revalidatePath("/admin/assets");
}

type PageProps = { params: { id: string } };

export default async function AssetDetailPage({ params }: PageProps) {
  await requireAdmin();
  const s = await getUiStrings();

  const supabase = createClient();
  const { data } = await supabase
    .from("photos")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!data) notFound();

  const photo = data as {
    id: string; storage_path: string; cdn_url: string | null;
    alt_text: string; caption: string | null; source: string;
    original_filename: string | null; mime_type: string | null;
    width_px: number | null; height_px: number | null; bytes: number | null;
    focal_point_x: number | null; focal_point_y: number | null;
    crop_strategy: string; aspect_ratios_generated: string[];
    blurhash: string | null; dominant_color: string | null;
    tags: string[];
    copyright_holder: string | null; license_type: string | null;
    license_expires_at: string | null; photographer_credit: string | null;
    license_notes: string | null;
    nsfw_flag: boolean; moderation_status: string; moderation_notes: string | null;
    ai_alt_text_suggested: string | null;
    is_featured: boolean; is_public: boolean;
    usage_count: number; created_at: string;
    watermarked: boolean | null;
  };

  const usageRows = await getPhotoUsage(params.id);

  return (
    <div className="space-y-6 max-w-5xl">
      <header className="flex items-center justify-between">
        <Link href="/admin/assets" className="text-xs text-warm-cream/50 hover:text-warm-cream/80">
          ← Assets
        </Link>
        <div className="flex items-center gap-2">
          {photo.usage_count === 0 && (
            <span className="text-xs px-2 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
              Orphan — not used anywhere
            </span>
          )}
          {photo.cdn_url && (
            <a
              href={photo.cdn_url}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-1.5 rounded-lg bg-warm-cream/10 border border-warm-cream/20 text-warm-cream text-xs font-semibold hover:bg-warm-cream/15 transition-colors"
              title={photo.watermarked
                ? "Download the watermarked WebP variant (1200px)"
                : "Download the WebP variant (no watermark)"}
            >
              ⬇ Download {photo.watermarked && <span className="text-legend-gold">★ watermarked</span>}
            </a>
          )}
          <DeleteAssetButton photoId={photo.id} usageCount={photo.usage_count} />
        </div>
      </header>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Preview */}
        <div className="space-y-4">
          <div className="rounded-2xl overflow-hidden aspect-video bg-warm-cream/5 relative"
            style={{ backgroundColor: photo.dominant_color ?? "#1a1a1a" }}>
            {photo.cdn_url && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={photo.cdn_url} alt={photo.alt_text}
                className="w-full h-full object-contain" />
            )}
            {/* Focal point dot */}
            {photo.focal_point_x != null && photo.focal_point_y != null && (
              <div
                className="absolute w-4 h-4 rounded-full border-2 border-white shadow-lg bg-legend-gold/60 -translate-x-2 -translate-y-2 pointer-events-none"
                style={{
                  left: `${(photo.focal_point_x ?? 0.5) * 100}%`,
                  top:  `${(photo.focal_point_y ?? 0.5) * 100}%`,
                }}
              />
            )}
          </div>

          {/* Crop preview strip */}
          {photo.storage_path && (
            <div className="space-y-2">
              <p className="text-xs text-warm-cream/40 uppercase tracking-wide">Crop previews</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {["1:1","4:3","16:9","9:16"].map((ratio) => {
                  const [w,h] = ratio.split(":").map(Number);
                  const fileRatio = ratio.replace(":", "x");
                  const photosBase = process.env.NEXT_PUBLIC_PHOTOS_CDN_URL
                    ? `${process.env.NEXT_PUBLIC_PHOTOS_CDN_URL.replace(/\/$/, "")}/photos`
                    : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos`;
                  const thumbUrl = `${photosBase}/${photo.storage_path}${fileRatio}-400.webp`;
                  return (
                    <div key={ratio} className="shrink-0 space-y-0.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={thumbUrl} alt={`${ratio} crop`}
                        className="rounded object-cover"
                        style={{ width: Math.round(60 * w/h), height: 60, backgroundColor: photo.dominant_color ?? "#1a1a1a" }}
                        loading="lazy"
                      />
                      <p className="text-[9px] text-warm-cream/30 text-center">{ratio}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Used in */}
          <div className="space-y-2">
            <p className="text-xs text-warm-cream/40 uppercase tracking-wide">
              Used in ({photo.usage_count} place{photo.usage_count !== 1 ? "s" : ""})
            </p>
            {usageRows.length === 0 ? (
              <p className="text-sm text-amber-300">Not used anywhere — consider deleting.</p>
            ) : (
              <ul className="space-y-1">
                {usageRows.map((u) => (
                  <li key={u.entity_id + u.field_name}
                    className="text-xs text-warm-cream/60 flex items-center gap-2">
                    <span className="text-warm-cream/30">•</span>
                    <span className="capitalize">{u.entity_type}</span>
                    {u.entity_id && <span className="font-mono text-warm-cream/30">{u.entity_id.slice(0,8)}</span>}
                    <span className="text-warm-cream/40">→ {u.field_name}</span>
                    {u.context && <span className="text-warm-cream/30">({u.context})</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Metadata */}
          <div className="rounded-xl border border-warm-cream/10 p-4 space-y-2 text-xs text-warm-cream/50">
            <p><span className="text-warm-cream/30">File:</span> {photo.original_filename ?? "—"}</p>
            <p><span className="text-warm-cream/30">MIME:</span> {photo.mime_type ?? "—"}</p>
            <p><span className="text-warm-cream/30">Dimensions:</span> {photo.width_px && photo.height_px ? `${photo.width_px}×${photo.height_px}px` : "—"}</p>
            <p><span className="text-warm-cream/30">Size:</span> {photo.bytes ? `${Math.round(photo.bytes/1024)}KB` : "—"}</p>
            <p><span className="text-warm-cream/30">Blurhash:</span> <span className="font-mono">{photo.blurhash ?? "—"}</span></p>
            {photo.dominant_color && (
              <div className="flex items-center gap-2">
                <span className="text-warm-cream/30">Dominant:</span>
                <span className="w-4 h-4 rounded border border-warm-cream/20 inline-block"
                  style={{ backgroundColor: photo.dominant_color }} />
                <span className="font-mono">{photo.dominant_color}</span>
              </div>
            )}
            <p><span className="text-warm-cream/30">Uploaded:</span> {new Date(photo.created_at).toLocaleString("nl-NL")}</p>
          </div>
        </div>

        {/* Edit form */}
        <form action={saveAsset} className="space-y-5">
          <input type="hidden" name="id" value={photo.id} />

          <div className="space-y-1.5">
            <label htmlFor="alt_text" className="block text-xs font-medium text-warm-cream/70 uppercase tracking-wide">
              Alt text <span className="text-red-400">*</span>
            </label>
            <input id="alt_text" name="alt_text" type="text" required
              defaultValue={photo.alt_text}
              className="w-full px-3 py-2 rounded-xl bg-warm-cream/5 border border-warm-cream/15 text-warm-cream text-sm focus:outline-none focus:ring-2 focus:ring-legend-gold/40" />
            {photo.ai_alt_text_suggested && (
              <p className="text-xs text-canal-light">
                AI suggested: "{photo.ai_alt_text_suggested}"
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="caption" className="block text-xs font-medium text-warm-cream/70 uppercase tracking-wide">Caption</label>
            <input id="caption" name="caption" type="text" defaultValue={photo.caption ?? ""}
              className="w-full px-3 py-2 rounded-xl bg-warm-cream/5 border border-warm-cream/15 text-warm-cream text-sm focus:outline-none focus:ring-2 focus:ring-legend-gold/40" />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="tags" className="block text-xs font-medium text-warm-cream/70 uppercase tracking-wide">Tags (comma-separated)</label>
            <input id="tags" name="tags" type="text" defaultValue={photo.tags.join(", ")}
              className="w-full px-3 py-2 rounded-xl bg-warm-cream/5 border border-warm-cream/15 text-warm-cream text-sm focus:outline-none focus:ring-2 focus:ring-legend-gold/40" />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-warm-cream/70 uppercase tracking-wide">Crop strategy</label>
            <select name="crop_strategy" defaultValue={photo.crop_strategy}
              className="w-full px-3 py-2 rounded-xl bg-warm-cream/5 border border-warm-cream/15 text-warm-cream text-sm"
              style={{ backgroundColor: "#0D0D0D", color: "#F7F3EC" }}>
              {CROP_OPTIONS.map((c) => <option key={c} value={c} style={{ backgroundColor: "#0D0D0D" }}>{c}</option>)}
            </select>
          </div>

          {/* License */}
          <div className="rounded-xl border border-warm-cream/10 p-4 space-y-3">
            <p className="text-xs text-warm-cream/50 uppercase tracking-wide">License & rights</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-warm-cream/50">License type</label>
                <select name="license_type" defaultValue={photo.license_type ?? "unknown"}
                  className="w-full px-2 py-1.5 rounded-lg bg-warm-cream/5 border border-warm-cream/15 text-warm-cream text-xs"
                  style={{ backgroundColor: "#0D0D0D", color: "#F7F3EC" }}>
                  {LICENSE_OPTIONS.map((l) => <option key={l} value={l} style={{ backgroundColor: "#0D0D0D" }}>{l}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-warm-cream/50">Expires</label>
                <input name="license_expires_at" type="date"
                  defaultValue={photo.license_expires_at ?? ""}
                  className="w-full px-2 py-1.5 rounded-lg bg-warm-cream/5 border border-warm-cream/15 text-warm-cream text-xs"
                  style={{ colorScheme: "dark" }} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-warm-cream/50">Copyright holder</label>
                <input name="copyright_holder" type="text" defaultValue={photo.copyright_holder ?? ""}
                  className="w-full px-2 py-1.5 rounded-lg bg-warm-cream/5 border border-warm-cream/15 text-warm-cream text-xs" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-warm-cream/50">Photographer credit</label>
                <input name="photographer_credit" type="text" defaultValue={photo.photographer_credit ?? ""}
                  className="w-full px-2 py-1.5 rounded-lg bg-warm-cream/5 border border-warm-cream/15 text-warm-cream text-xs" />
              </div>
            </div>
          </div>

          {/* Moderation */}
          <div className="rounded-xl border border-warm-cream/10 p-4 space-y-3">
            <p className="text-xs text-warm-cream/50 uppercase tracking-wide">Moderation</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-warm-cream/50">Status</label>
                <select name="moderation_status" defaultValue={photo.moderation_status}
                  className="w-full px-2 py-1.5 rounded-lg bg-warm-cream/5 border border-warm-cream/15 text-warm-cream text-xs"
                  style={{ backgroundColor: "#0D0D0D", color: "#F7F3EC" }}>
                  {MOD_OPTIONS.map((m) => <option key={m} value={m} style={{ backgroundColor: "#0D0D0D" }}>{m}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-warm-cream/50">NSFW flag</label>
                <select name="nsfw_flag" defaultValue={String(photo.nsfw_flag)}
                  className="w-full px-2 py-1.5 rounded-lg bg-warm-cream/5 border border-warm-cream/15 text-warm-cream text-xs"
                  style={{ backgroundColor: "#0D0D0D", color: "#F7F3EC" }}>
                  <option value="false" style={{ backgroundColor: "#0D0D0D" }}>No</option>
                  <option value="true"  style={{ backgroundColor: "#0D0D0D" }}>Yes — NSFW</option>
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-warm-cream/50">Moderation notes</label>
              <input name="moderation_notes" type="text" defaultValue={photo.moderation_notes ?? ""}
                className="w-full px-2 py-1.5 rounded-lg bg-warm-cream/5 border border-warm-cream/15 text-warm-cream text-xs" />
            </div>
          </div>

          {/* Flags */}
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="hidden" name="is_featured" value="false" />
              <input type="checkbox" name="is_featured" value="true" defaultChecked={photo.is_featured}
                className="w-4 h-4 rounded accent-legend-gold" />
              <span className="text-sm text-warm-cream/70">Featured</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="hidden" name="is_public" value="false" />
              <input type="checkbox" name="is_public" value="true" defaultChecked={photo.is_public}
                className="w-4 h-4 rounded accent-legend-gold" />
              <span className="text-sm text-warm-cream/70">Public</span>
            </label>
          </div>

          <button type="submit"
            className="px-6 py-2.5 rounded-full bg-legend-gold text-ink-black font-semibold text-sm hover:bg-gold-light transition-colors">
            {t(s, "common.save_changes", "Save changes")}
          </button>
        </form>
      </div>
    </div>
  );
}
