/**
 * Hand-maintained Supabase type definitions.
 * Kept in sync with supabase/migrations/*.sql.
 * Regenerate with: npx supabase gen types typescript --project-id idgobxvhbhdymfsfmhae > lib/supabase/database.types.ts
 * (requires: npx supabase login)
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          phone: string | null;
          nationality: string | null;
          preferred_language: string | null;
          stripe_customer_id: string | null;
          avatar_url: string | null;
          is_admin: boolean;
          is_verified: boolean;
          marketing_opt_in: boolean;
          gdpr_accepted_at: string | null;
          dob: string | null;
          adult_consent_at: string | null;
          internal_notes: string | null;
          is_vip: boolean;
          lifetime_bookings_count: number;
          lifetime_revenue_cents: number;
          dietary_notes: string | null;
          accessibility_notes: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["users"]["Row"], "id" | "is_admin" | "is_verified" | "marketing_opt_in" | "is_vip" | "lifetime_bookings_count" | "lifetime_revenue_cents"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["users"]["Row"]>;
      };
      staff: {
        Row: {
          id: string;
          user_id: string | null;
          city_id: string;
          role: "driver_only" | "guide_only" | "driver_guide" | "photographer" | "support" | "manager" | "owner" | "guide" | "driver" | "dispatcher" | "admin";
          status: string | null;
          certified_at: string | null;
          hourly_cents: number | null;
          notes: string | null;
          full_name: string;
          preferred_name: string | null;
          photo_url: string | null;
          bio_short: string | null;
          bio_long: string | null;
          phone: string | null;
          emergency_contact_name: string | null;
          emergency_contact_phone: string | null;
          hire_date: string | null;
          termination_date: string | null;
          hourly_rate_cents: number | null;
          daily_rate_cents: number | null;
          payout_method: "bank_transfer" | "cash" | "platform" | null;
          bank_iban: string | null;
          spoken_languages: string[];
          driving_license_number: string | null;
          driving_license_expiry: string | null;
          taxi_pas_number: string | null;
          taxi_pas_expiry: string | null;
          first_aid_cert_expiry: string | null;
          background_check_date: string | null;
          background_check_expiry: string | null;
          is_active: boolean;
          max_tours_per_day: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["staff"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["staff"]["Row"]>;
      };
      vehicles: {
        Row: {
          id: string;
          nickname: string;
          vehicle_type: "van" | "minivan" | "bus" | "sedan" | "bike" | "electric_bike" | "scooter" | "tram_pass" | "other";
          make: string | null;
          model: string | null;
          year: number | null;
          license_plate: string | null;
          vin: string | null;
          color: string | null;
          seats: number | null;
          wheelchair_accessible: boolean | null;
          purchase_date: string | null;
          purchase_price_cents: number | null;
          odometer_km: number | null;
          apk_expiry: string | null;
          insurance_expiry: string | null;
          insurance_policy_number: string | null;
          road_tax_expiry: string | null;
          last_service_date: string | null;
          last_service_km: number | null;
          service_interval_km: number;
          fuel_type: "petrol" | "diesel" | "electric" | "hybrid" | "lpg" | "na" | null;
          fuel_card_number: string | null;
          notes: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["vehicles"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["vehicles"]["Row"]>;
      };
      assignments: {
        Row: {
          id: string;
          booking_id: string | null;
          staff_id: string | null;
          vehicle_id: string | null;
          role_on_tour: "driver" | "guide" | "photographer" | "driver_guide" | "support" | null;
          pickup_at: string | null;
          dropoff_at: string | null;
          preflight_done_at: string | null;
          preflight_checklist: Json | null;
          started_at: string | null;
          completed_at: string | null;
          no_show_at: string | null;
          no_show_reason: string | null;
          odometer_start: number | null;
          odometer_end: number | null;
          fuel_cost_cents: number | null;
          guide_notes_on_customer: string | null;
          internal_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["assignments"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["assignments"]["Row"]>;
      };
      tip_payments: {
        Row: {
          id: string;
          booking_id: string | null;
          amount_cents: number;
          currency: string;
          recipient_staff_id: string | null;
          payment_method: "cash" | "stripe" | "platform_credit" | "other" | null;
          stripe_payment_intent_id: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["tip_payments"]["Row"], "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["tip_payments"]["Row"]>;
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh_key: string;
          auth_key: string;
          user_agent: string | null;
          created_at: string;
          last_seen_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["push_subscriptions"]["Row"], "id" | "created_at" | "last_seen_at"> & { id?: string; created_at?: string; last_seen_at?: string };
        Update: Partial<Database["public"]["Tables"]["push_subscriptions"]["Row"]>;
      };
      bookings: {
        Row: {
          id: string;
          user_id: string | null;
          tour_id: string | null;
          layover_id: string | null;
          party_size: number;
          scheduled_pickup_at: string | null;
          scheduled_dropoff_at: string | null;
          scheduled_pickup_date: string | null;
          total_cents: number;
          currency: string;
          status: "draft" | "pending_payment" | "paid" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show" | "refunded";
          stripe_session_id: string | null;
          stripe_payment_intent_id: string | null;
          paid_at: string | null;
          refunded_at: string | null;
          receipt_url: string | null;
          confirmation_email_sent_at: string | null;
          custom_route_id: string | null;
          customer_email: string | null;
          customer_name: string | null;
          cancellation_reason: string | null;
          cancellation_notes: string | null;
          cancelled_by_user_id: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["bookings"]["Row"], "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["bookings"]["Row"]>;
      };
      destinations: {
        Row: {
          id: string;
          category_id: string | null;
          name: string;
          slug: string;
          area: string | null;
          description: string | null;
          latitude: number | null;
          longitude: number | null;
          duration_minutes: number;
          is_active: boolean;
          requires_booking: boolean;
          is_seasonal: boolean;
          is_adult_only: boolean;
          wheelchair_accessible: boolean;
          created_at: string;
          updated_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["destinations"]["Row"], "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["destinations"]["Row"]>;
      };
      tours: {
        Row: {
          id: string;
          name: string;
          slug: string;
          tagline: string | null;
          description: string | null;
          duration_hours: number | null;
          price_cents: number | null;
          currency: string;
          max_group_size: number | null;
          min_group_size: number | null;
          is_active: boolean;
          is_adult_only: boolean;
          is_seasonal: boolean;
          requires_booking: boolean;
          vat_rate: number | null;
          image_url: string | null;
          stripe_product_id: string | null;
          stripe_price_id: string | null;
          meta_title: string | null;
          meta_description: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["tours"]["Row"], "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["tours"]["Row"]>;
      };
      layovers: {
        Row: {
          id: string;
          user_id: string | null;
          city_id: string | null;
          flight_in_at: string | null;
          flight_out_at: string | null;
          arrival_flight: string | null;
          departure_flight: string | null;
          party_size: number;
          has_checked_bags: boolean;
          status: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["layovers"]["Row"], "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["layovers"]["Row"]>;
      };
      addons: {
        Row: {
          id: string;
          name: string | null;
          description: string | null;
          short_blurb: string | null;
          service_type: string | null;
          availability_status: string | null;
          price_cents: number | null;
          cogs_cents: number | null;
          vat_rate: number | null;
          currency: string;
          image_url: string | null;
          stripe_product_id: string | null;
          stripe_price_id: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["addons"]["Row"], "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["addons"]["Row"]>;
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          event_type: string;
          payload: Json | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["audit_logs"]["Row"], "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["audit_logs"]["Row"]>;
      };
      translations: {
        Row: {
          id: string;
          entity_type: string;
          entity_id: string;
          field: string;
          language: string;
          value: string | null;
          source_hash: string | null;
          is_stale: boolean;
          translated_by: string | null;
          reviewed_at: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["translations"]["Row"], "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["translations"]["Row"]>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: { uid: string };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
