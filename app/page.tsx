import Image from "next/image";

const COMING_SOON_IMAGE =
  "https://idgobxvhbhdymfsfmhae.supabase.co/storage/v1/object/public/assets/homepage/comingsoon.PNG";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-brand-navy text-brand-cream">
      <section className="w-full max-w-3xl flex flex-col items-center text-center gap-8">
        <div className="relative w-full aspect-square max-w-xl">
          <Image
            src={COMING_SOON_IMAGE}
            alt="Layover Amsterdam — Coming Soon"
            fill
            priority
            sizes="(max-width: 768px) 90vw, 600px"
            className="object-contain drop-shadow-2xl"
          />
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight">
            Layover Amsterdam
          </h1>
          <p className="text-lg sm:text-xl text-brand-orange font-semibold">
            Coming Soon
          </p>
          <p className="text-sm sm:text-base text-brand-cream/80 max-w-xl mx-auto">
            Turn your Schiphol layover into a legend. Premium city tours between flights —
            launching soon.
          </p>
        </div>

        <div className="text-xs text-brand-cream/50 pt-6">
          © {new Date().getFullYear()} Layover Amsterdam. All rights reserved.
        </div>
      </section>
    </main>
  );
}
