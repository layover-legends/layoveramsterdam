import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUiStrings, t } from "@/lib/i18n/ui";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const SOURCE_TYPES = [
  { value: "press",            label: "Press" },
  { value: "partner",          label: "Partner" },
  { value: "award",            label: "Award" },
  { value: "customer",         label: "Customer" },
  { value: "featured_review",  label: "Featured review" },
];

async function saveTestimonial(formData: FormData) {
  "use server";
  const admin_ = await requireAdmin();
  const id = formData.get("id") as string | null;
  const values = {
    source_type:       formData.get("source_type") as string,
    quote:             ((formData.get("quote") as string) || "").trim(),
    attribution:       ((formData.get("attribution") as string) || "").trim(),
    attribution_url:   ((formData.get("attribution_url") as string) || "").trim() || null,
    source_logo_url:   ((formData.get("source_logo_url") as string) || "").trim() || null,
    context:           ((formData.get("context") as string) || "").trim() || null,
    sort_order:        parseInt(formData.get("sort_order") as string || "100", 10),
    is_active:         formData.get("is_active") !== "false",
    language:          "en",
  };

  const admin = createAdminClient();
  if (id) {
    await admin.from("testimonials").update({ ...values, updated_at: new Date().toISOString() }).eq("id", id);
  } else {
    await admin.from("testimonials").insert(values);
  }
  await admin.from("audit_logs").insert({
    user_id: admin_.id,
    event_type: id ? "testimonial_updated" : "testimonial_created",
    payload: { attribution: values.attribution },
  });
  revalidatePath("/admin/testimonials");
  redirect("/admin/testimonials?saved=1");
}

async function toggleActive(formData: FormData) {
  "use server";
  await requireAdmin();
  const id      = formData.get("id") as string;
  const current = formData.get("is_active") === "true";
  const admin = createAdminClient();
  await admin.from("testimonials").update({ is_active: !current }).eq("id", id);
  revalidatePath("/admin/testimonials");
}

type PageProps = { searchParams?: { saved?: string; new?: string; edit?: string } };

export default async function AdminTestimonialsPage({ searchParams }: PageProps) {
  await requireAdmin();
  const s = await getUiStrings();

  const supabase = createClient();
  const { data } = await supabase
    .from("testimonials")
    .select("*")
    .order("sort_order").order("created_at");

  const rows = (data ?? []) as {
    id: string; source_type: string; quote: string; attribution: string;
    context: string | null; sort_order: number; is_active: boolean;
  }[];

  const editId = searchParams?.edit ?? null;
  const showNew = searchParams?.new === "1";
  const editRow = editId ? rows.find((r) => r.id === editId) : null;

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <h1 className="font-display text-2xl sm:text-3xl font-semibold">Testimonials</h1>
        <Link href="/admin/testimonials?new=1"
          className="px-5 py-2.5 rounded-full bg-legend-gold text-ink-black font-semibold text-sm hover:bg-gold-light">
          + Add testimonial
        </Link>
      </header>

      {searchParams?.saved === "1" && (
        <div role="status" className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          {t(s, "admin.common.saved", "Saved.")}
        </div>
      )}

      {/* New/edit form */}
      {(showNew || editRow) && (
        <div className="rounded-2xl border border-legend-gold/20 bg-legend-gold/5 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-legend-gold uppercase tracking-wide">
            {editRow ? "Edit testimonial" : "New testimonial"}
          </h2>
          <form action={saveTestimonial} className="space-y-4">
            {editRow && <input type="hidden" name="id" value={editRow.id} />}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-warm-cream/70 uppercase tracking-wide">Source type</label>
                <select name="source_type" defaultValue={editRow?.source_type ?? "customer"}
                  className="w-full px-3 py-2 rounded-xl bg-warm-cream/5 border border-warm-cream/15 text-warm-cream text-sm"
                  style={{ backgroundColor: "#0D0D0D", color: "#F7F3EC" }}>
                  {SOURCE_TYPES.map((st) => (
                    <option key={st.value} value={st.value} style={{ backgroundColor: "#0D0D0D" }}>{st.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-warm-cream/70 uppercase tracking-wide">Sort order</label>
                <input name="sort_order" type="number" defaultValue={editRow?.sort_order ?? 100}
                  className="w-full px-3 py-2 rounded-xl bg-warm-cream/5 border border-warm-cream/15 text-warm-cream text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-warm-cream/70 uppercase tracking-wide">Quote *</label>
              <textarea name="quote" rows={3} required defaultValue={(editRow as { quote?: string } | null)?.quote ?? ""}
                className="w-full px-3 py-2 rounded-xl bg-warm-cream/5 border border-warm-cream/15 text-warm-cream text-sm resize-none focus:outline-none focus:ring-2 focus:ring-legend-gold/40" />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-warm-cream/70 uppercase tracking-wide">Attribution *</label>
                <input name="attribution" type="text" required defaultValue={(editRow as { attribution?: string } | null)?.attribution ?? ""}
                  placeholder='e.g. "Sarah J., NY Times"'
                  className="w-full px-3 py-2 rounded-xl bg-warm-cream/5 border border-warm-cream/15 text-warm-cream text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-warm-cream/70 uppercase tracking-wide">Attribution URL</label>
                <input name="attribution_url" type="url" defaultValue={(editRow as { attribution_url?: string } | null)?.attribution_url ?? ""}
                  placeholder="https://…"
                  className="w-full px-3 py-2 rounded-xl bg-warm-cream/5 border border-warm-cream/15 text-warm-cream text-sm" />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit"
                className="px-5 py-2 rounded-full bg-legend-gold text-ink-black font-semibold text-sm hover:bg-gold-light">
                Save
              </button>
              <Link href="/admin/testimonials"
                className="px-5 py-2 rounded-full border border-warm-cream/20 text-warm-cream/70 text-sm hover:bg-warm-cream/5">
                Cancel
              </Link>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      <div className="rounded-2xl border border-warm-cream/10 overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-warm-cream/[0.04] text-xs uppercase tracking-wide text-warm-cream/55">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Quote</th>
              <th className="px-4 py-3 text-left font-medium">Attribution</th>
              <th className="px-4 py-3 text-left font-medium">Type</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-warm-cream/10">
            {rows.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-warm-cream/40">No testimonials yet.</td></tr>
            ) : rows.map((row) => (
              <tr key={row.id} className="hover:bg-warm-cream/[0.03]">
                <td className="px-4 py-3 text-warm-cream/80 text-sm max-w-xs">
                  <p className="truncate">"{row.quote}"</p>
                </td>
                <td className="px-4 py-3 text-warm-cream/60 text-xs">{row.attribution}</td>
                <td className="px-4 py-3 text-warm-cream/50 text-xs capitalize">{row.source_type.replace(/_/g, " ")}</td>
                <td className="px-4 py-3">
                  <form action={toggleActive}>
                    <input type="hidden" name="id" value={row.id} />
                    <input type="hidden" name="is_active" value={String(row.is_active)} />
                    <button type="submit"
                      className={`text-xs px-2 py-0.5 rounded-full border ${
                        row.is_active
                          ? "bg-emerald-400/15 text-emerald-200 border-emerald-400/30"
                          : "bg-warm-cream/10 text-warm-cream/50 border-warm-cream/20"
                      }`}>
                      {row.is_active ? "Active" : "Inactive"}
                    </button>
                  </form>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/testimonials?edit=${row.id}`}
                    className="text-xs text-legend-gold hover:text-gold-light">Edit →</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
