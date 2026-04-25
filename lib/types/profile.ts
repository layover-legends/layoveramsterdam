// Mirrors the columns of public.users that the app reads/writes for the
// authenticated person. Keep in sync with the Supabase schema.
export type UserProfile = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  nationality: string | null; // ISO 3166-1 alpha-2
  preferred_language: string | null; // ISO 639-1, must be in SUPPORTED_LANGUAGES
  stripe_customer_id: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
  marketing_opt_in: boolean;
  created_at: string | null;
  updated_at: string | null;
};

// Subset of fields the user is allowed to edit from the /account page.
export type ProfileUpdate = {
  full_name: string | null;
  phone: string | null;
  nationality: string | null;
  preferred_language: string | null;
  marketing_opt_in: boolean;
};
