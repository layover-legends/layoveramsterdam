"use client";

import { useState } from "react";
import { submitReview } from "@/app/review/[token]/actions";

const COUNTRIES = [
  { code: "US", name: "United States" }, { code: "GB", name: "United Kingdom" },
  { code: "FR", name: "France" }, { code: "DE", name: "Germany" },
  { code: "NL", name: "Netherlands" }, { code: "BE", name: "Belgium" },
  { code: "CA", name: "Canada" }, { code: "AU", name: "Australia" },
  { code: "JP", name: "Japan" }, { code: "CN", name: "China" },
  { code: "KR", name: "South Korea" }, { code: "BR", name: "Brazil" },
  { code: "IT", name: "Italy" }, { code: "ES", name: "Spain" },
  { code: "CH", name: "Switzerland" }, { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" }, { code: "DK", name: "Denmark" },
  { code: "SG", name: "Singapore" }, { code: "IN", name: "India" },
  { code: "MX", name: "Mexico" }, { code: "AE", name: "UAE" },
  { code: "ZA", name: "South Africa" }, { code: "AR", name: "Argentina" },
  { code: "", name: "Other / Prefer not to say" },
];

type Props = {
  token: string;
  bookingId: string;
  tourId: string | null;
  userName: string;
  tourName: string;
  labels: Record<string, string>;
};

function lbl(labels: Record<string, string>, key: string, fb: string) {
  return labels[key] ?? fb;
}

export default function ReviewSubmitForm({ token, bookingId, tourId, userName, labels }: Props) {
  const [rating,  setRating]  = useState(0);
  const [hover,   setHover]   = useState(0);
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [charCount, setCharCount] = useState(0);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (rating === 0) { setError("Please select a star rating."); return; }
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("rating", String(rating));
    const result = await submitReview(fd);
    if (result.ok) {
      setSuccess(true);
    } else {
      setError(result.error);
    }
    setPending(false);
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/8 px-6 py-10 text-center space-y-4">
        <p className="text-4xl">⭐</p>
        <h2 className="font-display text-2xl font-semibold">
          {lbl(labels, "review.thanks_h", "Thank you for your review!")}
        </h2>
        <p className="text-warm-cream/60 text-sm">
          {lbl(labels, "review.thanks_body",
            "Your review helps future travelers choose the right layover experience. We appreciate you taking the time."
          )}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <input type="hidden" name="token"      value={token} />
      <input type="hidden" name="booking_id" value={bookingId} />
      {tourId && <input type="hidden" name="tour_id" value={tourId} />}

      {error && (
        <div role="alert" className="rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      )}

      {/* Star rating */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-warm-cream/80">
          {lbl(labels, "review.rating_label", "Overall rating")}<span className="text-red-400 ml-0.5">*</span>
        </label>
        <div className="flex gap-2">
          {[1,2,3,4,5].map((star) => (
            <button key={star} type="button"
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(star)}
              className={`text-4xl transition-transform hover:scale-110 ${
                star <= (hover || rating) ? "text-legend-gold" : "text-warm-cream/20"
              }`}
              aria-label={`${star} star${star !== 1 ? "s" : ""}`}>
              ★
            </button>
          ))}
        </div>
        {rating > 0 && (
          <p className="text-xs text-warm-cream/50">
            {["","Poor","Below average","Average","Good","Excellent"][rating]}
          </p>
        )}
      </div>

      {/* Reviewer name */}
      <div className="space-y-1.5">
        <label htmlFor="rv-name" className="block text-sm font-medium text-warm-cream/80">
          {lbl(labels, "review.name_label", "Your first name")}<span className="text-red-400 ml-0.5">*</span>
        </label>
        <input id="rv-name" name="reviewer_name" type="text" required
          defaultValue={userName.split(" ")[0]}
          className="w-full px-4 py-3 rounded-xl bg-warm-cream/5 border border-warm-cream/15 text-warm-cream text-sm focus:outline-none focus:ring-2 focus:ring-legend-gold/40" />
        <p className="text-xs text-warm-cream/30">
          {lbl(labels, "review.name_hint", "Shown publicly as first name only.")}
        </p>
      </div>

      {/* Country */}
      <div className="space-y-1.5">
        <label htmlFor="rv-country" className="block text-sm font-medium text-warm-cream/80">
          {lbl(labels, "review.country_label", "Country")}
        </label>
        <select id="rv-country" name="reviewer_country"
          className="w-full px-4 py-3 rounded-xl bg-warm-cream/5 border border-warm-cream/15 text-warm-cream text-sm focus:outline-none focus:ring-2 focus:ring-legend-gold/40"
          style={{ backgroundColor: "#0D0D0D", color: "#F7F3EC" }}>
          <option value="" style={{ backgroundColor: "#0D0D0D" }}>Select country…</option>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code} style={{ backgroundColor: "#0D0D0D" }}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Title */}
      <div className="space-y-1.5">
        <label htmlFor="rv-title" className="block text-sm font-medium text-warm-cream/80">
          {lbl(labels, "review.title_label", "Review title")}
        </label>
        <input id="rv-title" name="title" type="text" maxLength={120}
          placeholder={lbl(labels, "review.title_placeholder", "e.g. Best 3 hours in Amsterdam")}
          className="w-full px-4 py-3 rounded-xl bg-warm-cream/5 border border-warm-cream/15 text-warm-cream placeholder:text-warm-cream/30 text-sm focus:outline-none focus:ring-2 focus:ring-legend-gold/40" />
      </div>

      {/* Comment */}
      <div className="space-y-1.5">
        <label htmlFor="rv-comment" className="block text-sm font-medium text-warm-cream/80">
          {lbl(labels, "review.comment_label", "Your review")}<span className="text-red-400 ml-0.5">*</span>
        </label>
        <textarea id="rv-comment" name="comment" rows={6} required minLength={30} maxLength={4000}
          onChange={(e) => setCharCount(e.target.value.length)}
          placeholder={lbl(labels, "review.comment_placeholder", "Tell future travelers what you loved (and what could be better)…")}
          className="w-full px-4 py-3 rounded-xl bg-warm-cream/5 border border-warm-cream/15 text-warm-cream placeholder:text-warm-cream/30 text-sm focus:outline-none focus:ring-2 focus:ring-legend-gold/40 resize-none" />
        <div className="flex justify-between text-xs text-warm-cream/30">
          <span>Min. 30 characters</span>
          <span>{charCount}/4000</span>
        </div>
      </div>

      <button type="submit" disabled={pending || rating === 0}
        className="w-full px-6 py-4 rounded-2xl bg-legend-gold text-ink-black font-bold text-base hover:bg-gold-light disabled:opacity-50 transition-colors">
        {pending
          ? lbl(labels, "review.submitting", "Submitting…")
          : lbl(labels, "review.submit", "Submit review →")}
      </button>

      <p className="text-xs text-warm-cream/30 text-center">
        {lbl(labels, "review.verified_badge", "Verified purchase · Your review will appear after moderation (usually within 24h).")}
      </p>
    </form>
  );
}
