-- Phase 7d — Tour catalog lock (before Stripe price IDs are minted)
-- Adds catalog columns + locks prices/descriptions for all 7 tours.
-- Idempotent: safe to re-run.

BEGIN;

-- ============================================================
-- Part 1 — Schema additions
-- ============================================================

ALTER TABLE public.tours
  ADD COLUMN IF NOT EXISTS min_group_size INT NOT NULL DEFAULT 1
    CHECK (min_group_size >= 1),
  ADD COLUMN IF NOT EXISTS max_group_size INT
    CHECK (max_group_size IS NULL OR max_group_size >= min_group_size),
  ADD COLUMN IF NOT EXISTS pricing_model TEXT NOT NULL DEFAULT 'flat'
    CHECK (pricing_model IN ('flat','per_person')),
  ADD COLUMN IF NOT EXISTS transport_mode TEXT NOT NULL DEFAULT 'van'
    CHECK (transport_mode IN ('van','bus','public_transit','walking','bike')),
  ADD COLUMN IF NOT EXISTS delivery_mode TEXT NOT NULL DEFAULT 'human_guide'
    CHECK (delivery_mode IN ('human_guide','ai_guide','self_guided')),
  ADD COLUMN IF NOT EXISTS includes_photographer BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS launch_mode BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
  ADD COLUMN IF NOT EXISTS vat_rate NUMERIC(4,3) NOT NULL DEFAULT 0.21;

-- ============================================================
-- Part 2 — Lock the 5 existing tours
-- ============================================================
-- Prices in cents, EUR, VAT-inclusive.
-- launch_mode = TRUE means "owner can validate by driving solo bookings" — flip to FALSE post-launch.

UPDATE public.tours SET
  price_cents     = 6900,
  pricing_model   = 'flat',
  min_group_size  = 1,
  max_group_size  = 6,
  transport_mode  = 'van',
  delivery_mode   = 'human_guide',
  duration_minutes= 240,
  tagline         = 'Amsterdam in a flash. The hits, the highlights, back before boarding.',
  description     = 'A 4-hour highlight reel for tight layovers. Pickup at Schiphol, drop at Schiphol. Canal belt, Vondelpark, Dam Square, the Jordaan — your driver-guide threads the needle. Built for travelers with a 6–8 hour gap and zero patience for queues.'
WHERE slug = 'sprint';

UPDATE public.tours SET
  price_cents     = 12900,
  pricing_model   = 'flat',
  min_group_size  = 1,
  max_group_size  = 6,
  transport_mode  = 'van',
  delivery_mode   = 'human_guide',
  duration_minutes= 420,
  tagline         = 'Amsterdam, properly. Seven hours, no shortcuts.',
  description     = 'The full Amsterdam day, paced for travelers who want depth, not a checklist. Canal cruise, Rijksmuseum or Van Gogh entry on you, a coffee stop where locals actually drink coffee, lunch in De Pijp. Your guide adapts the route to weather, energy, and what actually moves you.'
WHERE slug = 'classic';

UPDATE public.tours SET
  price_cents     = 4900,
  pricing_model   = 'per_person',
  min_group_size  = 4,
  max_group_size  = 16,
  transport_mode  = 'bus',
  delivery_mode   = 'human_guide',
  duration_minutes= 360,
  tagline         = 'Share the day, split the cost. €49 per person.',
  description     = 'A 6-hour shared bus tour for layover travelers who want the experience without the private price. Mixed group from your day''s flights — you''ll meet people. Canal cruise included. Minimum 4, maximum 16. If we can''t fill the minimum, we offer a refund or a discounted private upgrade.'
WHERE slug = 'group';

UPDATE public.tours SET
  price_cents     = 29900,
  pricing_model   = 'flat',
  min_group_size  = 1,
  max_group_size  = 6,
  transport_mode  = 'van',
  delivery_mode   = 'human_guide',
  duration_minutes= 480,
  tagline         = 'Amsterdam, your way. Up to 6 travelers, 8 hours.',
  description     = 'Private vehicle, private guide, your itinerary. Tell us what you want — coffee shops or coffee culture, Anne Frank or contemporary art, lunch with a chef or a sandwich on a canal — we build the day. €299 flat, up to 6 people. Same price for 1 or 6, so bring the family.'
WHERE slug = 'private';

UPDATE public.tours SET
  price_cents     = 8900,
  pricing_model   = 'flat',
  min_group_size  = 1,
  max_group_size  = 6,
  transport_mode  = 'van',
  delivery_mode   = 'human_guide',
  is_adult_only   = TRUE,
  duration_minutes= 300,
  tagline         = 'After hours, after dark. 18+ only.',
  description     = '5 hours of Amsterdam''s adult side, guided by someone who actually goes out. Late-night canal-side bars, the Red Light District with context (not gawking), a brown café for a nightcap. 18+ verification required. Last pickup 21:00, drop at Schiphol by 02:30 for early flights.'
WHERE slug = 'after-dark';

-- ============================================================
-- Part 3 — Insert two new tours
-- ============================================================
-- transit-classic: lower-cost variant using public transport (no van)
-- ai-sprint:       AI-guided variant, voice-first M3 moat

DO $$
DECLARE
  ams_id UUID;
BEGIN
  SELECT id INTO ams_id FROM public.cities WHERE slug = 'amsterdam' LIMIT 1;
  IF ams_id IS NULL THEN
    RAISE EXCEPTION 'Amsterdam city missing — run multitenant-backfill.sql first';
  END IF;

  INSERT INTO public.tours
    (city_id, slug, name, price_cents, pricing_model, min_group_size, max_group_size,
     transport_mode, delivery_mode, duration_minutes, tagline, description,
     is_active, is_adult_only, vat_rate, launch_mode)
  VALUES
    (ams_id, 'transit-classic', 'Transit Classic', 5900, 'flat', 1, 4,
     'public_transit', 'human_guide', 360,
     'Amsterdam by tram, like a local. Lower carbon, lower price.',
     'A 6-hour walking and public-transit tour for travelers who want the city at street level. We use the GVB metro, tram, and a few good legs of walking — no van, no traffic, no fuss. Day pass included. Cheaper than the Classic, slower in the best way.',
     TRUE, FALSE, 0.21, TRUE),

    (ams_id, 'ai-sprint', 'AI Sprint', 3900, 'flat', 1, 4,
     'van', 'ai_guide', 240,
     'AI-guided. Voice in your ear, city in your eyes. €39.',
     'A 4-hour driver-only run with our AI guide narrating in your headphones. Same Sprint route, no human guide — just a quiet driver and an AI that knows the city, your interests, and your pace. Pick the voice (warm local, dry historian, or witty Brit). Cheaper, quieter, and weirdly intimate. Beta — earn 50% off your next tour by reviewing.',
     TRUE, FALSE, 0.21, TRUE)
  ON CONFLICT (slug) DO UPDATE SET
    city_id          = EXCLUDED.city_id,
    price_cents      = EXCLUDED.price_cents,
    pricing_model    = EXCLUDED.pricing_model,
    min_group_size   = EXCLUDED.min_group_size,
    max_group_size   = EXCLUDED.max_group_size,
    transport_mode   = EXCLUDED.transport_mode,
    delivery_mode    = EXCLUDED.delivery_mode,
    duration_minutes = EXCLUDED.duration_minutes,
    tagline          = EXCLUDED.tagline,
    description      = EXCLUDED.description,
    is_active        = EXCLUDED.is_active,
    is_adult_only    = EXCLUDED.is_adult_only,
    vat_rate         = EXCLUDED.vat_rate,
    launch_mode      = EXCLUDED.launch_mode;
END $$;

-- ============================================================
-- Part 4 — Mark old EN translations stale (auto-retranslate kicks in)
-- ============================================================

UPDATE public.translations
   SET is_stale = TRUE
 WHERE entity_type = 'tour'
   AND field IN ('tagline','description')
   AND language != 'en';

COMMIT;

-- ============================================================
-- Sanity check
-- ============================================================
SELECT slug, price_cents, pricing_model, min_group_size, max_group_size,
       transport_mode, delivery_mode, is_adult_only, launch_mode,
       LENGTH(description) AS desc_len
  FROM public.tours
 WHERE is_active
 ORDER BY price_cents;
-- Expect 7 rows: ai-sprint €39, group €49 pp, transit-classic €59,
-- sprint €69, after-dark €89, classic €129, private €299
