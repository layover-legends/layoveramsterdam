"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateLayover } from "@/lib/validation/layover";
import { track } from "@/lib/analytics/track";

export async function createLayover(formData: FormData) {
  const validation = validateLayover(formData);
  if (!validation.ok) {
    redirect(`/layover?error=${encodeURIComponent(validation.error)}`);
  }

  const { data } = validation;

  if (!data.city_id) {
    redirect("/layover?error=City+not+found.");
  }

  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();

  const supabase = createAdminClient();
  const { data: layover, error } = await supabase
    .from("layovers")
    .insert({
      city_id: data.city_id,
      user_id: user?.id ?? null,
      flight_in_at: data.flight_in_at,
      flight_out_at: data.flight_out_at,
      arrival_terminal: data.arrival_terminal,
      departure_terminal: data.departure_terminal,
      arrival_flight: data.arrival_flight,
      departure_flight: data.departure_flight,
      party_size: data.party_size,
      has_checked_bags: data.has_checked_bags,
    })
    .select("id")
    .single();

  if (error) {
    redirect(`/layover?error=${encodeURIComponent("Could not save layover: " + error.message)}`);
  }

  track("layover_submitted", {
    layover_id: layover.id,
    city_id: data.city_id,
    party_size: data.party_size,
    arrival_flight: data.arrival_flight,
    departure_flight: data.departure_flight,
    has_checked_bags: data.has_checked_bags,
  }, { user_id: user?.id, city_id: data.city_id });

  redirect(`/tours?layover=${layover.id}`);
}
