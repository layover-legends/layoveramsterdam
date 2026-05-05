import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUiStrings } from "@/lib/i18n/ui";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS = ["all","new","replied","closed","spam"];
const PAGE_SIZE = 40;

type PageProps = { searchParams?: { status?: string; page?: string } };

async function markReplied(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  const admin = createAdminClient();
  await admin.from("contact_submissions").update({
    status: "replied", replied_at: new Date().toISOString(),
  }).eq("id", id);
  await admin.from("audit_logs").insert({
    event_type: "contact_replied", payload: { submission_id: id },
  });
  revalidatePath("/admin/contact");
}

async function markClosed(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  const admin = createAdminClient();
  await admin.from("contact_submissions").update({ status: "closed" }).eq("id", id);
  revalidatePath("/admin/contact");
}

async function markSpam(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  const admin = createAdminClient();
  await admin.from("contact_submissions").update({ status: "spam" }).eq("id", id);
  revalidatePath("/admin/contact");
}

export default async function AdminContactPage({ searchParams }: PageProps) {
  await requireAdmin();

  const status = searchParams?.status ?? "new";
  const page   = Math.max(1, Number(searchParams?.page ?? 1) || 1);

  const supabase = createClient();
  let q = supabase
    .from("contact_submissions")
    .select("*", { count: "exact" });
  if (status !== "all") q = q.eq("status", status);

  const { data, count, error } = await q
    .order("created_at", { ascending: false })
    .range((page-1)*PAGE_SIZE, page*PAGE_SIZE-1);

  if (error) throw error;
  const rows = (data ?? []) as {
    id: string; name: string; email: string; phone: string | null;
    subject: string; message: string; status: string;
    replied_at: string | null; created_at: string;
  }[];

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const buildHref  = (p: number, st?: string) => {
    const qs = new URLSearchParams();
    const st2 = st ?? status;
    if (st2 !== "all") qs.set("status", st2);
    if (p > 1) qs.set("page", String(p));
    return qs.toString() ? `/admin/contact?${qs}` : "/admin/contact";
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold">Contact inbox</h1>
        <p className="text-sm text-warm-cream/60 mt-1">{count ?? 0} {status !== "all" ? status : "total"} messages</p>
      </header>

      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((st) => (
          <Link key={st} href={buildHref(1, st)}
            className={`px-3 py-1.5 rounded-full border text-xs capitalize transition-colors ${
              status === st
                ? "bg-legend-gold/15 border-legend-gold/40 text-legend-gold"
                : "border-warm-cream/15 text-warm-cream/60 hover:bg-warm-cream/5"
            }`}>
            {st}
          </Link>
        ))}
      </div>

      <div className="space-y-3">
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-warm-cream/10 px-6 py-12 text-center text-warm-cream/40">
            No {status !== "all" ? status : ""} messages.
          </div>
        ) : rows.map((row) => (
          <div key={row.id}
            className={`rounded-2xl border p-5 space-y-3 ${
              row.status === "new"
                ? "border-legend-gold/20 bg-legend-gold/5"
                : "border-warm-cream/10 bg-warm-cream/3"
            }`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-warm-cream/90">
                  {row.name}
                  <span className="ml-2 text-xs text-warm-cream/40 font-normal capitalize">
                    {row.subject.replace(/_/g, " ")}
                  </span>
                </p>
                <a href={`mailto:${row.email}`} className="text-sm text-legend-gold hover:text-gold-light">
                  {row.email}
                </a>
                {row.phone && <span className="ml-3 text-xs text-warm-cream/40">{row.phone}</span>}
              </div>
              <span className="text-xs text-warm-cream/40">
                {new Date(row.created_at).toLocaleString("nl-NL")}
              </span>
            </div>
            <p className="text-sm text-warm-cream/70 leading-relaxed whitespace-pre-line">
              {row.message}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <a href={`mailto:${row.email}?subject=Re: ${encodeURIComponent(row.subject.replace(/_/g, " "))}`}
                className="px-4 py-1.5 rounded-full bg-legend-gold text-ink-black text-xs font-medium hover:bg-gold-light">
                Reply via email ↗
              </a>
              <form action={markReplied}>
                <input type="hidden" name="id" value={row.id} />
                <button type="submit"
                  className="px-4 py-1.5 rounded-full border border-emerald-400/30 text-emerald-300 text-xs hover:bg-emerald-400/10">
                  Mark replied
                </button>
              </form>
              <form action={markClosed}>
                <input type="hidden" name="id" value={row.id} />
                <button type="submit"
                  className="px-4 py-1.5 rounded-full border border-warm-cream/15 text-warm-cream/40 text-xs hover:bg-warm-cream/5">
                  Close
                </button>
              </form>
              <form action={markSpam}>
                <input type="hidden" name="id" value={row.id} />
                <button type="submit"
                  className="px-4 py-1.5 rounded-full border border-warm-cream/10 text-warm-cream/30 text-xs hover:bg-warm-cream/5">
                  Spam
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-warm-cream/60">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            {page > 1 && <Link href={buildHref(page-1)} className="px-3 py-1.5 rounded-lg border border-warm-cream/15">← Prev</Link>}
            {page < totalPages && <Link href={buildHref(page+1)} className="px-3 py-1.5 rounded-lg border border-warm-cream/15">Next →</Link>}
          </div>
        </div>
      )}
    </div>
  );
}
