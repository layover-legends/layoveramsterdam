import type { ReviewRow } from "@/lib/admin/reviews";

type Props = {
  review: ReviewRow;
  showOperatorResponse?: boolean;
};

const COUNTRY_FLAGS: Record<string, string> = {
  US:"🇺🇸",GB:"🇬🇧",FR:"🇫🇷",DE:"🇩🇪",NL:"🇳🇱",BE:"🇧🇪",CA:"🇨🇦",AU:"🇦🇺",
  JP:"🇯🇵",CN:"🇨🇳",KR:"🇰🇷",BR:"🇧🇷",IT:"🇮🇹",ES:"🇪🇸",CH:"🇨🇭",SE:"🇸🇪",
  NO:"🇳🇴",DK:"🇩🇰",SG:"🇸🇬",IN:"🇮🇳",MX:"🇲🇽",AE:"🇦🇪",ZA:"🇿🇦",AR:"🇦🇷",
};

export default function ReviewCard({ review, showOperatorResponse = true }: Props) {
  const stars = Array.from({ length: 5 }, (_, i) => i < review.rating ? "★" : "☆");
  const date  = new Date(review.created_at).toLocaleDateString("en-NL", {
    month: "short", year: "numeric",
  });
  const flag  = review.reviewer_country ? COUNTRY_FLAGS[review.reviewer_country] ?? "" : "";

  return (
    <article className="rounded-2xl border border-warm-cream/10 bg-warm-cream/3 p-5 space-y-3">
      {/* Header: stars + name + country + date */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-legend-gold tracking-wider text-sm" aria-label={`${review.rating} out of 5 stars`}>
              {stars.join("")}
            </span>
            {review.is_verified_purchase && (
              <span className="text-xs text-emerald-400/70 border border-emerald-400/20 px-1.5 py-0.5 rounded-full">
                Verified
              </span>
            )}
          </div>
          {review.title && (
            <p className="font-semibold text-warm-cream/90 text-sm">{review.title}</p>
          )}
        </div>
        <div className="text-xs text-warm-cream/40 text-right shrink-0">
          <div>{flag} {review.reviewer_name}{review.reviewer_country ? `, ${review.reviewer_country}` : ""}</div>
          <div>{date}</div>
        </div>
      </div>

      {/* Review body */}
      {review.comment && (
        <p className="text-sm text-warm-cream/75 leading-relaxed whitespace-pre-line">
          {review.comment}
        </p>
      )}

      {/* Operator response */}
      {showOperatorResponse && review.operator_response && (
        <div className="rounded-xl border border-legend-gold/20 bg-legend-gold/5 px-4 py-3 space-y-1">
          <p className="text-xs font-semibold text-legend-gold">Response from Layover Legends</p>
          <p className="text-xs text-warm-cream/70 leading-relaxed">{review.operator_response}</p>
        </div>
      )}
    </article>
  );
}
