import Link from "next/link";
import AssetGrid from "@/components/admin/AssetGrid";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import { getUiStrings, t } from "@/lib/i18n/ui";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 48;
const SOURCE_OPTIONS = [
  "tour","addon","staff","vehicle","destination","about","marketing","customer_upload","review"
];
const LICENSE_OPTIONS = ["owned","royalty_free","unsplash","creative_commons","licensed","unknown"];
const USAGE_OPTIONS   = [
  { value: "all",      label: "All" },
  { value: "used",     label: "Used (1+)" },
  { value: "orphaned", label: "Orphaned (0 uses)" },
  { value: "featured", label: "Featured" },
];
const MOD_OPTIONS = ["all","auto_approved","pending_review","approved","rejected"];

type PageProps = {
  searchParams?: {
    source?: string; license?: string; usage?: string; mod?: string;
    q?: string; sort?: string; view?: string; page?: string;
  };
};

export default async function AdminAssetsPage({ searchParams }: PageProps) {
  await requireAdmin();

  const source  = searchParams?.source  ?? "all";
  const license = searchParams?.license ?? "all";
  const usage   = searchParams?.usage   ?? "all";
  const mod     = searchParams?.mod     ?? "all";
  const q       = (searchParams?.q ?? "").trim();
  const sort    = searchParams?.sort    ?? "created_at";
  const view    = searchParams?.view    ?? "grid";
  const page    = Math.max(1, Number(searchParams?.page ?? 1) || 1);

  const s       = await getUiStrings();
  const supabase = createClient();

  // ── Summary from view ─────────────────────────────────────────────────────
  const { data: summary } = await supabase
    .from("v_asset_library_summary")
    .select("*")
    .maybeSingle();
  type SummaryRow = {
    total_photos: number; orphaned_count: number; pending_moderation: number;
    license_expiring_soon: number; nsfw_flagged: number; total_bytes: number;
    unique_uploaders: number;
  };
  const summaryRow = summary as SummaryRow | null;

  // ── Build query ───────────────────��───────────────────────────────────────
  let qry = supabase.from("photos").select(
    "id, storage_path, cdn_url, alt_text, source, original_filename, bytes, width_px, height_px, usage_count, is_featured, moderation_status, license_type, license_expires_at, tags, dominant_color, blurhash, created_at",
    { count: "exact" }
  );

  if (source  !== "all") qry = qry.eq("source", source);
  if (license !== "all") qry = qry.eq("license_type", license);
  if (mod     !== "all") qry = qry.eq("moderation_status", mod);
  if (usage === "used")     qry = qry.gt("usage_count", 0);
  if (usage === "orphaned") qry = qry.eq("usage_count", 0);
  if (usage === "featured") qry = qry.eq("is_featured", true);
  // Full-text search across alt_text + caption + filename + tags via the
  // search_tsv tsvector column (GIN-indexed, scales to 100k+ photos). Falls
  // back to ilike for very short queries where tsquery is overkill.
  if (q) {
    if (q.length >= 3) {
      qry = qry.textSearch("search_tsv", q, { type: "websearch", config: "simple" });
    } else {
      qry = qry.or(`alt_text.ilike.%${q}%,original_filename.ilike.%${q}%`);
    }
  }

  const sortMap: Record<string, string> = {
    "created_at": "created_at",
    "usage_desc": "usage_count",
    "bytes_desc": "bytes",
    "alt_asc":    "alt_text",
  };
  const ascending = sort === "alt_asc";
  qry = qry.order(sortMap[sort] ?? "created_at", { ascending })
           .range((page-1)*PAGE_SIZE, page*PAGE_SIZE-1);

  const { data: photos, count, error } = await qry;
  if (error) console.error("[assets]", error.message);

  const rows = (photos ?? []) as {
    id: string; storage_path: string; cdn_url: string | null; alt_text: string;
    source: string; original_filename: string | null; bytes: number | null;
    width_px: number | null; height_px: number | null; usage_count: number;
    is_featured: boolean; moderation_status: string; license_type: string | null;
    license_expires_at: string | null; tags: string[]; dominant_color: string | null;
    created_at: string;
  }[];

  const totalPages  = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const buildHref   = (extra: Record<string,string>) => {
    const qs = new URLSearchParams({ source, license, usage, mod, sort, view, page: String(page) });
    if (q) qs.set("q", q);
    Object.entries(extra).forEach(([k,v]) => { if (v) qs.set(k, v); else qs.delete(k); });
    return `/admin/assets?${qs}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-2xl sm:text-3xl font-semibold">
            {t(s, "admin.assets.title", "Assets")}
          </h1>
          {summaryRow && (
            <p className="text-sm text-warm-cream/60">
              {summaryRow.total_photos} total ·{" "}
              {summaryRow.orphaned_count > 0 && <span className="text-amber-300">{summaryRow.orphaned_count} orphan{summaryRow.orphaned_count !== 1 ? "s" : ""} · </span>}
              {summaryRow.pending_moderation > 0 && <span className="text-orange-300">{summaryRow.pending_moderation} pending · </span>}
              {summaryRow.license_expiring_soon > 0 && <span className="text-red-300">{summaryRow.license_expiring_soon} license expiring · </span>}
              {summaryRow.total_bytes > 0 && <span>{(summaryRow.total_bytes / 1024 / 1024).toFixed(1)} MB</span>}
            </p>
          )}
        </div>
        <Link href="/admin/assets/upload"
          className="px-5 py-2.5 rounded-full bg-legend-gold text-ink-black font-semibold text-sm hover:bg-gold-light transition-colors">
          {t(s, "admin.assets.upload_button", "Upload photos")}
        </Link>
      </header>

      {/* Filters — pure GET form, no JS handlers; works without JS too */}
      <form method="GET" action="/admin/assets" className="flex flex-wrap gap-3 text-sm">
        {/* Carry forward filters not represented by selects in this form */}
        {usage !== "all"        && <input type="hidden" name="usage" value={usage} />}
        {sort  !== "created_at" && <input type="hidden" name="sort"  value={sort} />}
        {view  !== "grid"       && <input type="hidden" name="view"  value={view} />}

        {/* Source */}
        <select name="source" defaultValue={source}
          className="px-3 py-1.5 rounded-lg bg-warm-cream/5 border border-warm-cream/15 text-warm-cream text-xs cursor-pointer"
          style={{ backgroundColor: "#0D0D0D", color: "#F7F3EC" }}>
          <option value="all">All sources</option>
          {SOURCE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>

        {/* License */}
        <select name="license" defaultValue={license}
          className="px-3 py-1.5 rounded-lg bg-warm-cream/5 border border-warm-cream/15 text-warm-cream text-xs cursor-pointer"
          style={{ backgroundColor: "#0D0D0D", color: "#F7F3EC" }}>
          <option value="all">All licenses</option>
          {LICENSE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>

        {/* Moderation */}
        <select name="mod" defaultValue={mod}
          className="px-3 py-1.5 rounded-lg bg-warm-cream/5 border border-warm-cream/15 text-warm-cream text-xs cursor-pointer"
          style={{ backgroundColor: "#0D0D0D", color: "#F7F3EC" }}>
          {MOD_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>

        {/* Search */}
        <input name="q" defaultValue={q} placeholder="Search alt, tags, filename…"
          className="px-3 py-1.5 rounded-lg bg-warm-cream/5 border border-warm-cream/15 text-warm-cream placeholder:text-warm-cream/30 text-xs w-48" />

        <button type="submit"
          className="px-3 py-1.5 rounded-lg bg-legend-gold text-ink-black text-xs font-semibold hover:bg-gold-light transition-colors">
          Apply
        </button>

        {/* Usage chips — Links so single-tap works without submitting the form */}
        {USAGE_OPTIONS.map((u) => (
          <Link key={u.value} href={buildHref({ usage: u.value, page: "1" })}
            className={`px-3 py-1.5 rounded-full border text-xs transition-colors ${
              usage === u.value
                ? "bg-legend-gold/15 border-legend-gold/40 text-legend-gold"
                : "border-warm-cream/15 text-warm-cream/60 hover:bg-warm-cream/5"
            }`}>
            {u.label}
          </Link>
        ))}

        {/* View toggle */}
        <div className="flex border border-warm-cream/15 rounded-lg overflow-hidden ml-auto">
          <Link href={buildHref({ view: "grid" })}
            className={`px-3 py-1.5 text-xs transition-colors ${view === "grid" ? "bg-warm-cream/15 text-warm-cream" : "text-warm-cream/50 hover:bg-warm-cream/5"}`}>
            ⊞ Grid
          </Link>
          <Link href={buildHref({ view: "list" })}
            className={`px-3 py-1.5 text-xs transition-colors ${view === "list" ? "bg-warm-cream/15 text-warm-cream" : "text-warm-cream/50 hover:bg-warm-cream/5"}`}>
            ≡ List
          </Link>
        </div>
      </form>

      {/* Grid / List */}
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-warm-cream/10 px-6 py-12 text-center text-warm-cream/40">
          No photos found. <Link href="/admin/assets/upload" className="text-legend-gold hover:text-gold-light">Upload some →</Link>
        </div>
      ) : (
        <AssetGrid rows={rows} view={view === "list" ? "list" : "grid"} />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-warm-cream/60">
          <span>Page {page} of {totalPages} · {count} photos</span>
          <div className="flex gap-2">
            {page > 1 && <Link href={buildHref({ page: String(page-1) })} className="px-3 py-1.5 rounded-lg border border-warm-cream/15 hover:bg-warm-cream/5">← Prev</Link>}
            {page < totalPages && <Link href={buildHref({ page: String(page+1) })} className="px-3 py-1.5 rounded-lg border border-warm-cream/15 hover:bg-warm-cream/5">Next →</Link>}
          </div>
        </div>
      )}
    </div>
  );
}
