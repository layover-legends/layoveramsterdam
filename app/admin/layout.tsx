import { Suspense, type ReactNode } from "react";
import { requireAdmin } from "@/lib/auth/require-admin";
import AdminSidebar from "@/components/admin/AdminSidebar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-brand-navy text-brand-cream">
      <Suspense fallback={<aside className="w-full lg:w-64 bg-brand-navy border-b lg:border-b-0 lg:border-r border-brand-cream/10" />}>
        <AdminSidebar
          email={admin.email}
          fullName={admin.fullName}
          avatarUrl={admin.avatarUrl}
        />
      </Suspense>
      <main className="flex-1 px-5 sm:px-8 py-8 lg:py-10 w-full max-w-6xl mx-auto">
        {children}
      </main>
    </div>
  );
}
