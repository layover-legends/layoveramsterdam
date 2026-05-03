"use client";

import { useState } from "react";
import { t } from "@/lib/i18n/ui";

type Props = {
  serviceId: string;
  labels: Record<string, string>;
};

type State = "idle" | "submitting" | "success" | "already" | "error";

export default function ComingSoonForm({ serviceId, labels }: Props) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setState("submitting");

    try {
      const res = await fetch("/api/shop/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId, email: email.trim() }),
      });
      const data = (await res.json()) as { ok: boolean; already?: boolean };
      if (data.already) setState("already");
      else if (data.ok) setState("success");
      else setState("error");
    } catch {
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <p className="text-sm text-emerald-400">
        ✓ {t(labels, "shop.coming_soon.success", "We'll email you when this is available.")}
      </p>
    );
  }

  if (state === "already") {
    return (
      <p className="text-sm text-warm-cream/60">
        {t(labels, "shop.coming_soon.already", "You're already on the waitlist.")}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t(labels, "shop.coming_soon.email_placeholder", "your@email.com")}
        className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-warm-cream/15 bg-warm-cream/5 text-sm text-warm-cream placeholder-warm-cream/30 focus:outline-none focus:border-legend-gold/50 transition-colors"
      />
      <button
        type="submit"
        disabled={state === "submitting"}
        className="px-4 py-2 rounded-lg bg-warm-cream/10 border border-warm-cream/15 text-sm text-warm-cream/80 hover:text-warm-cream hover:border-warm-cream/30 transition-colors disabled:opacity-50 whitespace-nowrap"
      >
        {state === "submitting"
          ? "…"
          : t(labels, "shop.coming_soon.notify_button", "Notify me")}
      </button>
    </form>
  );
}
