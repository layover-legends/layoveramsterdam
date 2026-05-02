export type LayoverInput = {
  arrival_flight: string | null;
  arrival_terminal: string | null;
  flight_in_at: string;
  departure_flight: string | null;
  departure_terminal: string | null;
  flight_out_at: string;
  party_size: number;
  has_checked_bags: boolean;
  city_id: string;
};

export type LayoverValidationResult =
  | { ok: true; data: LayoverInput }
  | { ok: false; error: string };

export function validateLayover(input: FormData): LayoverValidationResult {
  const flight_in_at = (input.get("flight_in_at") ?? "").toString().trim();
  const flight_out_at = (input.get("flight_out_at") ?? "").toString().trim();
  const partySizeRaw = Number(input.get("party_size") ?? "1");
  const has_checked_bags = input.get("has_checked_bags") === "on";
  const city_id = (input.get("city_id") ?? "").toString().trim();

  if (!flight_in_at) return { ok: false, error: "Landing time is required." };
  if (!flight_out_at) return { ok: false, error: "Take-off time is required." };

  const inDate = new Date(flight_in_at);
  const outDate = new Date(flight_out_at);

  if (isNaN(inDate.getTime())) return { ok: false, error: "Landing time is invalid." };
  if (isNaN(outDate.getTime())) return { ok: false, error: "Take-off time is invalid." };
  if (outDate <= inDate) return { ok: false, error: "Departure must be after arrival." };

  const party_size = isNaN(partySizeRaw) ? 1 : Math.round(partySizeRaw);
  if (party_size < 1 || party_size > 12) return { ok: false, error: "Party size must be between 1 and 12." };

  return {
    ok: true,
    data: {
      arrival_flight: (input.get("arrival_flight") ?? "").toString().trim() || null,
      arrival_terminal: (input.get("arrival_terminal") ?? "").toString().trim() || null,
      flight_in_at: inDate.toISOString(),
      departure_flight: (input.get("departure_flight") ?? "").toString().trim() || null,
      departure_terminal: (input.get("departure_terminal") ?? "").toString().trim() || null,
      flight_out_at: outDate.toISOString(),
      party_size,
      has_checked_bags,
      city_id: city_id || "",
    },
  };
}
