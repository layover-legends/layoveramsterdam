import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStaffByUserId } from "@/lib/admin/staff";
import RegisterServiceWorker from "@/components/driver/RegisterServiceWorker";

export const dynamic = "force-dynamic";

export default async function DriverLayout({ children }: { children: ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/?auth_required=1");
  }

  // Must be an active staff member
  const staff = await getStaffByUserId(user.id);
  if (!staff) {
    redirect("/?error=driver_access_only");
  }

  return (
    <div className="min-h-screen bg-black text-warm-cream font-sans">
      <RegisterServiceWorker />

      {/* Fixed top bar — brand + staff name */}
      <header className="sticky top-0 z-30 bg-black/90 backdrop-blur border-b border-warm-cream/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-display text-legend-gold font-semibold tracking-wider text-sm">
            LL Driver
          </span>
          <span className="text-warm-cream/30">·</span>
          <span className="text-sm text-warm-cream/70">
            {staff.preferred_name || staff.full_name}
          </span>
        </div>
        <a href="/driver/profile" className="text-warm-cream/40 hover:text-warm-cream/70 text-sm transition-colors">
          ◑
        </a>
      </header>

      {/* Main content */}
      <main className="pb-24">
        {children}
      </main>

      {/* Fixed bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-black/95 backdrop-blur border-t border-warm-cream/10 flex">
        {[
          { href: "/driver/today",    label: "Today",    icon: "📅" },
          { href: "/driver/tomorrow", label: "Tomorrow", icon: "🌅" },
          { href: "/driver/profile",  label: "Profile",  icon: "◑"  },
        ].map(({ href, label, icon }) => (
          <a key={href} href={href}
            className="flex-1 flex flex-col items-center gap-1 py-3 text-warm-cream/50 hover:text-warm-cream/90 transition-colors active:text-legend-gold">
            <span className="text-xl leading-none">{icon}</span>
            <span className="text-[10px] uppercase tracking-wide">{label}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}
