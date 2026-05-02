"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  cityId: string | null;
  formAction: (formData: FormData) => Promise<void>;
};

// Blueprint+ D4 — format "kl1234" → "KL 1234"
function formatFlightNumber(raw: string): string {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const letters = clean.match(/^[A-Z]+/)?.[0]?.slice(0, 2) ?? "";
  const digits = clean.slice(letters.length).replace(/[^0-9]/g, "").slice(0, 4);
  if (letters.length >= 2 && digits.length > 0) return `${letters} ${digits}`;
  return clean.slice(0, 7);
}

// Blueprint+ D1 — typewriter pre-fill sequence
const TYPEWRITER_STEPS: Array<{ field: "arr" | "dep"; value: string }> = [
  { field: "arr", value: "KL 1234" },
  { field: "dep", value: "AF 567" },
];

function useTypewriter(
  setArr: (v: string) => void,
  setDep: (v: string) => void,
  arrFocused: boolean,
  depFocused: boolean,
) {
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) return;
    if (arrFocused || depFocused) return;

    hasAnimated.current = true;
    let isCancelled = false;
    const delay = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));

    async function animate() {
      await delay(800);
      if (isCancelled) return;

      for (let i = 1; i <= TYPEWRITER_STEPS[0].value.length; i++) {
        if (isCancelled) return;
        setArr(TYPEWRITER_STEPS[0].value.slice(0, i));
        await delay(90);
      }
      await delay(400);
      if (isCancelled) return;

      for (let i = 1; i <= TYPEWRITER_STEPS[1].value.length; i++) {
        if (isCancelled) return;
        setDep(TYPEWRITER_STEPS[1].value.slice(0, i));
        await delay(90);
      }
    }

    void animate();
    return () => { isCancelled = true; };
  }, [setArr, setDep, arrFocused, depFocused]);
}

export default function HeroFlightForm({ cityId, formAction }: Props) {
  const [arrFlight, setArrFlight] = useState("");
  const [depFlight, setDepFlight] = useState("");
  const [arrFocused, setArrFocused] = useState(false);
  const [depFocused, setDepFocused] = useState(false);
  const [pending, setPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useTypewriter(setArrFlight, setDepFlight, arrFocused, depFocused);

  function handleArrChange(e: React.ChangeEvent<HTMLInputElement>) {
    setArrFlight(e.target.value.toUpperCase().replace(/[^A-Z0-9 ]/g, ""));
  }
  function handleDepChange(e: React.ChangeEvent<HTMLInputElement>) {
    setDepFlight(e.target.value.toUpperCase().replace(/[^A-Z0-9 ]/g, ""));
  }
  function handleArrBlur(e: React.FocusEvent<HTMLInputElement>) {
    setArrFlight(formatFlightNumber(e.target.value));
    setArrFocused(false);
  }
  function handleDepBlur(e: React.FocusEvent<HTMLInputElement>) {
    setDepFlight(formatFlightNumber(e.target.value));
    setDepFocused(false);
  }
  function handleArrFocus() {
    setArrFocused(true);
    if (!arrFocused) setArrFlight((v) => (v === "KL 1234" ? "" : v));
  }
  function handleDepFocus() {
    setDepFocused(true);
    if (!depFocused) setDepFlight((v) => (v === "AF 567" ? "" : v));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const fd = new FormData(e.currentTarget);
    // Overwrite displayed flight values with formatted ones
    fd.set("arrival_flight", arrFlight.trim());
    fd.set("departure_flight", depFlight.trim());
    try {
      await formAction(fd);
    } finally {
      setPending(false);
    }
  }

  const inputClass =
    "w-full bg-warm-cream/5 border border-warm-cream/20 rounded-xl px-4 py-3 text-sm text-warm-cream placeholder-warm-cream/30 focus:outline-none focus:border-legend-gold/70 focus:bg-warm-cream/8 transition-all font-mono tracking-wide";
  const labelClass = "block text-[10px] uppercase tracking-widest text-warm-cream/40 mb-1.5 font-semibold";

  return (
    <form
      id="hero-form"
      ref={formRef}
      onSubmit={handleSubmit}
      className="w-full max-w-2xl mx-auto bg-ink-black/60 backdrop-blur-sm border border-warm-cream/10 rounded-2xl p-5 sm:p-7 space-y-5 shadow-2xl scroll-mt-24"
    >
      {cityId && <input type="hidden" name="city_id" value={cityId} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Arrival */}
        <div>
          <label htmlFor="arrival_flight" className={labelClass}>Arrival flight</label>
          <input
            id="arrival_flight"
            name="arrival_flight"
            type="text"
            autoComplete="off"
            placeholder="KL 1234"
            value={arrFlight}
            onChange={handleArrChange}
            onFocus={handleArrFocus}
            onBlur={handleArrBlur}
            maxLength={8}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="flight_in_at" className={labelClass}>Landing time</label>
          <input
            id="flight_in_at"
            name="flight_in_at"
            type="datetime-local"
            required
            className={inputClass + " [color-scheme:dark]"}
          />
        </div>

        {/* Departure */}
        <div>
          <label htmlFor="departure_flight" className={labelClass}>Departure flight</label>
          <input
            id="departure_flight"
            name="departure_flight"
            type="text"
            autoComplete="off"
            placeholder="AF 567"
            value={depFlight}
            onChange={handleDepChange}
            onFocus={handleDepFocus}
            onBlur={handleDepBlur}
            maxLength={8}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="flight_out_at" className={labelClass}>Take-off time</label>
          <input
            id="flight_out_at"
            name="flight_out_at"
            type="datetime-local"
            required
            className={inputClass + " [color-scheme:dark]"}
          />
        </div>
      </div>

      <div className="flex items-end gap-4">
        <div className="w-28 shrink-0">
          <label htmlFor="party_size" className={labelClass}>Travellers</label>
          <input
            id="party_size"
            name="party_size"
            type="number"
            min="1"
            max="12"
            defaultValue="2"
            required
            className={inputClass}
          />
        </div>

        <button
          type="submit"
          disabled={pending || !cityId}
          className="flex-1 py-3 rounded-xl bg-legend-gold text-ink-black font-semibold text-sm uppercase tracking-widest hover:bg-gold-light active:bg-gold-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-legend-gold/20"
        >
          {pending ? "Searching…" : "Find Tours →"}
        </button>
      </div>

      {/* Trust strip */}
      <p className="text-center text-[11px] text-warm-cream/40 tracking-wide">
        Insured
        <span className="mx-2 text-legend-gold/50">·</span>
        4.9★ average rating
        <span className="mx-2 text-legend-gold/50">·</span>
        100% on-time return
      </p>
    </form>
  );
}
