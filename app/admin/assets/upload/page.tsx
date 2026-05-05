import { requireAdmin } from "@/lib/auth/require-admin";
import { getUiStrings, t } from "@/lib/i18n/ui";
import Link from "next/link";
import AssetUploadForm from "@/components/admin/AssetUploadForm";

export const dynamic = "force-dynamic";

export default async function AssetUploadPage() {
  await requireAdmin();
  const s = await getUiStrings();

  return (
    <div className="space-y-6 max-w-3xl">
      <header className="space-y-1">
        <Link href="/admin/assets" className="text-xs text-warm-cream/50 hover:text-warm-cream/80">
          ← {t(s, "admin.assets.title", "Assets")}
        </Link>
        <h1 className="font-display text-2xl font-semibold">Upload photos</h1>
        <p className="text-sm text-warm-cream/60">
          Smart-crop pipeline: 5 aspect ratios × 3 sizes × 3 formats = 45 variants per photo.
          Alt text is required on every upload (GDPR + a11y).
        </p>
      </header>
      <AssetUploadForm labels={s} />
    </div>
  );
}
