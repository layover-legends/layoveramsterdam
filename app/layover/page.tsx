import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createLayover } from "./actions";

export const dynamic = "force-dynamic";

async function getAmsterdamCityId(): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("cities")
    .select("id")
    .eq("slug", "amsterdam")
    .maybeSingle();
  return data?.id ?? null;
}

type PageProps = {
  searchParams?: { error?: string };
};

export default async function LayoverPage({ searchParams }: PageProps) {
  const cityId = await getAmsterdamCityId();
  const error = searchParams?.error;

  return (
    <main className="min-h-screen bg-ink-black text-warm-cream px-5 py-12">
      <div className="max-w-xl mx-auto space-y-8">
        <header className="space-y-2">
          <Link href="/" className="text-sm text-warm-cream/50 hover:text-warm-cream/80 transition-colors">
            ← Back to home
          </Link>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
            Plan your layover
          </h1>
          <p className="text-warm-cream/60">
            Tell us your flights and we&apos;ll match the perfect Amsterdam experience.
          </p>
        </header>

        {error && (
          <div role="alert" className="rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-200">
            {decodeURIComponent(error)}
          </div>
        )}

        {!cityId && (
          <div role="alert" className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
            Amsterdam city configuration not found. Please run the cities migration in Supabase.
          </div>
        )}

        <form action={createLayover} className="space-y-6">
          {cityId && <input type="hidden" name="city_id" value={cityId} />}

          <fieldset className="space-y-4">
            <legend className="text-xs uppercase tracking-widest text-legend-gold font-semibold">
              Arriving flight
            </legend>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="arrival_flight" className="block text-sm text-warm-cream/70">
                  Flight number
                </label>
                <input
                  id="arrival_flight"
                  name="arrival_flight"
                  type="text"
                  placeholder="KL 1234"
                  className="w-full rounded-lg bg-warm-cream/5 border border-warm-cream/15 px-3 py-2.5 text-sm text-warm-cream placeholder-warm-cream/30 focus:outline-none focus:border-legend-gold/60 transition-colors font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="arrival_terminal" className="block text-sm text-warm-cream/70">
                  Terminal
                </label>
                <input
                  id="arrival_terminal"
                  name="arrival_terminal"
                  type="text"
                  placeholder="D"
                  className="w-full rounded-lg bg-warm-cream/5 border border-warm-cream/15 px-3 py-2.5 text-sm text-warm-cream placeholder-warm-cream/30 focus:outline-none focus:border-legend-gold/60 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="flight_in_at" className="block text-sm text-warm-cream/70">
                Landing time <span className="text-red-400">*</span>
              </label>
              <input
                id="flight_in_at"
                name="flight_in_at"
                type="datetime-local"
                required
                className="w-full rounded-lg bg-warm-cream/5 border border-warm-cream/15 px-3 py-2.5 text-sm text-warm-cream focus:outline-none focus:border-legend-gold/60 transition-colors [color-scheme:dark]"
              />
            </div>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-xs uppercase tracking-widest text-legend-gold font-semibold">
              Departing flight
            </legend>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="departure_flight" className="block text-sm text-warm-cream/70">
                  Flight number
                </label>
                <input
                  id="departure_flight"
                  name="departure_flight"
                  type="text"
                  placeholder="AF 567"
                  className="w-full rounded-lg bg-warm-cream/5 border border-warm-cream/15 px-3 py-2.5 text-sm text-warm-cream placeholder-warm-cream/30 focus:outline-none focus:border-legend-gold/60 transition-colors font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="departure_terminal" className="block text-sm text-warm-cream/70">
                  Terminal
                </label>
                <input
                  id="departure_terminal"
                  name="departure_terminal"
                  type="text"
                  placeholder="E"
                  className="w-full rounded-lg bg-warm-cream/5 border border-warm-cream/15 px-3 py-2.5 text-sm text-warm-cream placeholder-warm-cream/30 focus:outline-none focus:border-legend-gold/60 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="flight_out_at" className="block text-sm text-warm-cream/70">
                Take-off time <span className="text-red-400">*</span>
              </label>
              <input
                id="flight_out_at"
                name="flight_out_at"
                type="datetime-local"
                required
                className="w-full rounded-lg bg-warm-cream/5 border border-warm-cream/15 px-3 py-2.5 text-sm text-warm-cream focus:outline-none focus:border-legend-gold/60 transition-colors [color-scheme:dark]"
              />
            </div>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-xs uppercase tracking-widest text-legend-gold font-semibold">
              Your group
            </legend>

            <div className="space-y-1.5">
              <label htmlFor="party_size" className="block text-sm text-warm-cream/70">
                Party size
              </label>
              <input
                id="party_size"
                name="party_size"
                type="number"
                min="1"
                max="12"
                defaultValue="1"
                className="w-full rounded-lg bg-warm-cream/5 border border-warm-cream/15 px-3 py-2.5 text-sm text-warm-cream focus:outline-none focus:border-legend-gold/60 transition-colors"
              />
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                name="has_checked_bags"
                type="checkbox"
                className="w-4 h-4 rounded border-warm-cream/30 bg-warm-cream/5 accent-legend-gold"
              />
              <span className="text-sm text-warm-cream/70">
                I have checked bags (we&apos;ll schedule extra time)
              </span>
            </label>
          </fieldset>

          <button
            type="submit"
            className="w-full py-3.5 rounded-full bg-legend-gold text-ink-black font-semibold text-base tracking-wide hover:bg-gold-light active:bg-gold-dark transition-colors"
          >
            Find my tours →
          </button>
        </form>
      </div>
    </main>
  );
}
