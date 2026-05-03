-- Phase 9d — Trust signals, content polish, multi-currency display
-- Run in Supabase SQL Editor (idempotent — safe to re-run)
-- Apply BEFORE generating TypeScript types or building UI.

-- ── 1. Enable CITEXT extension (for case-insensitive email) ──────────────────
CREATE EXTENSION IF NOT EXISTS citext;

-- ── 2. Extend translations entity_type to cover new entity kinds ──────────────
-- Drop the existing check constraint and replace with the expanded set
DO $$
DECLARE v_conname TEXT;
BEGIN
  SELECT c.conname INTO v_conname
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  JOIN pg_namespace n ON t.relnamespace = n.oid
  WHERE n.nspname = 'public' AND t.relname = 'translations'
    AND c.contype = 'c' AND pg_get_constraintdef(c.oid) LIKE '%entity_type%';
  IF v_conname IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.translations DROP CONSTRAINT ' || quote_ident(v_conname);
  END IF;
END $$;

ALTER TABLE public.translations
  ADD CONSTRAINT translations_entity_type_check
  CHECK (entity_type IN (
    'destination','tour','article','ui',
    'faq_entry','testimonial','review','contact'
  ));

-- ── 3. tours — add review aggregates ─────────────────────────────────────────
ALTER TABLE public.tours
  ADD COLUMN IF NOT EXISTS avg_rating     NUMERIC(3,2),
  ADD COLUMN IF NOT EXISTS reviews_count  INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_review_at TIMESTAMPTZ;

-- ── 4. Augment existing reviews scaffold → full verified-review schema ────────
-- Existing scaffold has: id, booking_id (UNIQUE FK), rating (SMALLINT 1-5),
-- body (TEXT), is_published (BOOLEAN DEFAULT TRUE), created_at.
-- We add all operational fields. Verified-purchase RLS is the centerpiece.

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS user_id               UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tour_id               UUID REFERENCES public.tours(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS title                 TEXT,
  ADD COLUMN IF NOT EXISTS comment               TEXT,
  ADD COLUMN IF NOT EXISTS photos                UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS language              TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS reviewer_name         TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS reviewer_country      CHAR(2),
  ADD COLUMN IF NOT EXISTS status                TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS rejection_reason      TEXT,
  ADD COLUMN IF NOT EXISTS operator_response     TEXT,
  ADD COLUMN IF NOT EXISTS operator_response_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS helpful_count         INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reported_count        INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ip_address            INET,
  ADD COLUMN IF NOT EXISTS user_agent            TEXT,
  ADD COLUMN IF NOT EXISTS is_verified_purchase  BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Backfill status from legacy is_published column
UPDATE public.reviews
  SET status = CASE WHEN is_published THEN 'approved' ELSE 'rejected' END
  WHERE status = 'pending' AND is_published IS NOT NULL;

-- Backfill tour_id from booking join (best-effort for existing scaffold rows)
UPDATE public.reviews r
  SET tour_id = b.tour_id
  FROM public.bookings b
  WHERE r.booking_id = b.id AND r.tour_id IS NULL;

-- Add CHECK constraints (idempotent via DO $$)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reviews_status_check'
  ) THEN
    ALTER TABLE public.reviews ADD CONSTRAINT reviews_status_check
      CHECK (status IN ('pending','approved','rejected','spam','flagged'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reviews_title_length'
  ) THEN
    ALTER TABLE public.reviews ADD CONSTRAINT reviews_title_length
      CHECK (title IS NULL OR length(title) <= 120);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reviews_comment_length'
  ) THEN
    ALTER TABLE public.reviews ADD CONSTRAINT reviews_comment_length
      CHECK (comment IS NULL OR length(comment) BETWEEN 30 AND 4000);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reviews_operator_response_length'
  ) THEN
    ALTER TABLE public.reviews ADD CONSTRAINT reviews_operator_response_length
      CHECK (operator_response IS NULL OR length(operator_response) <= 2000);
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reviews_tour_status
  ON public.reviews(tour_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_status_created
  ON public.reviews(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_user
  ON public.reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating
  ON public.reviews(tour_id, rating);

-- Trigger: keep tours.avg_rating / reviews_count / last_review_at fresh
CREATE OR REPLACE FUNCTION public.update_tour_review_stats()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tour UUID := COALESCE(NEW.tour_id, OLD.tour_id);
BEGIN
  IF v_tour IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  UPDATE public.tours t SET
    avg_rating     = (SELECT ROUND(AVG(rating)::NUMERIC, 2)
                      FROM public.reviews WHERE tour_id = v_tour AND status = 'approved'),
    reviews_count  = (SELECT COUNT(*)
                      FROM public.reviews WHERE tour_id = v_tour AND status = 'approved'),
    last_review_at = (SELECT MAX(created_at)
                      FROM public.reviews WHERE tour_id = v_tour AND status = 'approved')
  WHERE t.id = v_tour;
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_review_stats ON public.reviews;
CREATE TRIGGER trg_review_stats
  AFTER INSERT OR UPDATE OF status OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_tour_review_stats();

-- RLS for reviews — drop old policies, add comprehensive new set
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'reviews'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON public.reviews';
  END LOOP;
END $$;

-- Public reads only approved reviews
CREATE POLICY reviews_public_read ON public.reviews
  FOR SELECT USING (status = 'approved');

-- Users can see their own reviews regardless of status
CREATE POLICY reviews_own_read ON public.reviews
  FOR SELECT USING (user_id = auth.uid());

-- Admins see everything
CREATE POLICY reviews_admin_all ON public.reviews
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- VERIFIED PURCHASE ONLY INSERT enforced at DB level — PostgREST cannot bypass this
CREATE POLICY reviews_verified_insert ON public.reviews
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.bookings
      WHERE id = booking_id
        AND user_id = auth.uid()
        AND status = 'completed'
    )
  );

-- Users can edit title/comment/photos only (not rating/status) within 24h
CREATE POLICY reviews_own_update ON public.reviews
  FOR UPDATE USING (
    user_id = auth.uid()
    AND created_at > NOW() - INTERVAL '24 hours'
  )
  WITH CHECK (user_id = auth.uid());

-- ── 5. review_request_log ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.review_request_log (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id    UUID        NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  sent_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  opened_at     TIMESTAMPTZ,
  clicked_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  unique_token  TEXT        NOT NULL UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_review_request_token
  ON public.review_request_log(unique_token);
CREATE INDEX IF NOT EXISTS idx_review_request_booking
  ON public.review_request_log(booking_id);

ALTER TABLE public.review_request_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='review_request_log' AND policyname='review_request_admin_all') THEN
    CREATE POLICY review_request_admin_all ON public.review_request_log
      FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
  END IF;
END $$;

-- ── 6. faq_entries ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.faq_entries (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  category    TEXT        NOT NULL
    CHECK (category IN ('booking','payment','cancellation','tours','logistics',
                        'safety','accessibility','after_dark','business','other')),
  sort_order  INT         NOT NULL DEFAULT 100,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  question    TEXT        NOT NULL,
  answer      TEXT        NOT NULL,
  source_lang TEXT        NOT NULL DEFAULT 'en',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_faq_active_sort
  ON public.faq_entries(is_active, category, sort_order) WHERE is_active;

ALTER TABLE public.faq_entries ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='faq_entries' AND policyname='faq_public_read') THEN
    CREATE POLICY faq_public_read ON public.faq_entries
      FOR SELECT USING (is_active = TRUE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='faq_entries' AND policyname='faq_admin_all') THEN
    CREATE POLICY faq_admin_all ON public.faq_entries
      FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
  END IF;
END $$;

-- Seed starter FAQs (30 entries covering all categories)
INSERT INTO public.faq_entries (category, sort_order, question, answer) VALUES
  -- Booking
  ('booking', 10, 'How do I book a layover tour?',
   'Enter your arrival and departure flight numbers on our booking page. We''ll show available tours that fit your layover window. Select your tour, choose add-ons, and pay securely via Stripe. You''ll receive a confirmation email within minutes.'),
  ('booking', 20, 'How far in advance should I book?',
   'We recommend booking at least 48 hours in advance to guarantee your spot. Last-minute bookings (within 24h) are sometimes available — check the tour page for availability. For group bookings of 6+, please contact us at least 1 week ahead.'),
  ('booking', 30, 'Can I book for a group?',
   'Yes! Our tours accommodate up to 8 guests. For larger groups (9+), contact us directly at travellayoverlegends@gmail.com and we''ll arrange a private tour. Group rates available for 6+ guests.'),
  ('booking', 40, 'Do I need to create an account?',
   'You need to sign in with Google to complete a booking. This keeps your booking history in one place and lets you access your digital itinerary any time. We never post to your Google account.'),
  -- Payment
  ('payment', 10, 'What payment methods do you accept?',
   'We accept all major credit cards (Visa, Mastercard, Amex), iDEAL (Dutch bank transfer), Bancontact, and Google/Apple Pay via our secure Stripe checkout. All transactions are in EUR.'),
  ('payment', 20, 'Why is my card charged in EUR when the price showed in USD?',
   'Prices are displayed in your local currency for convenience, but all charges are processed in EUR by Stripe. Your bank converts the amount at their exchange rate, which may differ slightly from the displayed price. The EUR amount is always shown on the checkout page before you pay.'),
  ('payment', 30, 'Is my payment information secure?',
   'Completely. We never see or store your card details. All payments are processed by Stripe, a PCI DSS Level 1 certified payment processor used by millions of businesses worldwide.'),
  ('payment', 40, 'Do you offer invoices for business travel?',
   'Yes. Email travellayoverlegends@gmail.com after booking with your company name and VAT number. We''ll send a formal VAT invoice within 24 hours.'),
  -- Cancellation
  ('cancellation', 10, 'What is your cancellation policy?',
   'Free cancellation up to 48 hours before your tour start time for a full refund. Cancellations within 24–48 hours receive a 50% refund. No refund within 24 hours of the tour, except in the case of flight cancellations (see below). Full details on our cancellation policy page.'),
  ('cancellation', 20, 'My flight was cancelled — can I get a full refund?',
   'Yes. If your inbound flight is cancelled or severely delayed (2h+), we issue a full refund regardless of when you cancel. Send us a screenshot of your airline''s cancellation notice to travellayoverlegends@gmail.com.'),
  ('cancellation', 30, 'My flight is delayed. Will the tour wait for me?',
   'We monitor flight statuses and will wait up to 30 minutes for delayed arrivals. If your delay is longer, contact us immediately via phone or email — we''ll do our best to accommodate a rescheduled start or offer a partial tour. Major delays (2h+) qualify for full refund.'),
  ('cancellation', 40, 'Can I reschedule instead of cancelling?',
   'Yes, one free reschedule is allowed up to 48 hours before the original tour time, subject to availability. Contact travellayoverlegends@gmail.com to reschedule.'),
  -- Tours
  ('tours', 10, 'How long are the tours?',
   'Our tours range from 2.5 hours (Sprint Tour — perfect for a 4h layover) to 5 hours (Classic Grand Tour — ideal for 7h+ layovers). Each tour page shows the exact duration and minimum recommended layover time. We always recommend having at least 90 minutes to spare before your departure gate closes.'),
  ('tours', 20, 'Where do tours start and end?',
   'All tours depart from and return to Amsterdam Schiphol Airport. Our guide meets you at the arrivals hall (specific meeting point confirmed in your booking confirmation). The tour returns you to the terminal with time to clear security.'),
  ('tours', 30, 'What languages are the tours in?',
   'Our guides speak English, French, and Dutch. We can accommodate Spanish and German speakers with advance notice (subject to guide availability). The booking form asks for your preferred language.'),
  ('tours', 40, 'What''s included in the tour price?',
   'All guided transportation, entrance fees for any booked stops, and a digital itinerary. Food and drinks at cafes/restaurants are not included unless specified as an add-on. Tipping is optional and goes directly to your guide.'),
  -- Logistics
  ('logistics', 10, 'How do I get from the airport to the tour starting point?',
   'Your guide meets you inside the airport arrivals hall — no transportation required. From there, we handle all transport (private vehicle, public transit, or walking depending on the tour). You never have to navigate Amsterdam alone.'),
  ('logistics', 20, 'Is luggage storage available?',
   'The airport has luggage storage at multiple locations (Baggage Service, Stationsplein, P-floors). We recommend storing bags before the tour for comfort. Our Sprint Tour is designed for travelers with carry-on only.'),
  ('logistics', 30, 'What should I wear?',
   'Comfortable walking shoes are essential — cobblestones are charming but unforgiving. Amsterdam weather is unpredictable; a light rain jacket is always a good idea. In winter (Nov–Mar), dress warmly in layers.'),
  -- Safety
  ('safety', 10, 'Are your guides background-checked?',
   'Yes. All guides and drivers pass a Dutch VOG (Certificate of Good Conduct) background check before their first tour. We also carry full public liability insurance.'),
  ('safety', 20, 'What happens in case of an emergency during the tour?',
   'Every guide carries a first-aid kit and has first-aid certification. The Dutch emergency number is 112 (police, ambulance, fire). Your guide will have the nearest hospital address for your tour route.'),
  -- Accessibility
  ('accessibility', 10, 'Are tours wheelchair accessible?',
   'Our Classic Canal Tour and Sprint Tour can be adapted for wheelchair users with advance notice — we use an accessible vehicle and route that avoids stairs. Please mention mobility needs at booking or email us. The historic center has cobblestones that may be challenging; we''ll plan accordingly.'),
  ('accessibility', 20, 'Are the tours suitable for children?',
   'All family tours are suitable for children 3+. Children under 12 pay the reduced rate. We have booster seats in our vehicles. Our Family Amsterdam tour is specifically designed with kids in mind — canals, windmills, stroopwafels, and a surprising amount of history that kids actually engage with.'),
  -- After Dark
  ('after_dark', 10, 'What is the age requirement for After Dark tours?',
   'You must be 18 or older to book any After Dark, Red Light District, or coffee shop tour. We verify age via a date-of-birth check during booking. All guests on the tour must meet the age requirement — we cannot accommodate under-18 guests on adult tours.'),
  ('after_dark', 20, 'What does the After Dark tour include?',
   'The After Dark tour explores Amsterdam''s famous nightlife culture: the Red Light District, traditional brown cafes (bruine kroeg), a licensed coffee shop visit (consumption optional), and the illuminated canal belt. This is a guided cultural tour — not a pub crawl. Discretion and respect are required throughout.'),
  -- Business
  ('business', 10, 'Are you a registered business?',
   'Yes. Layover Legends is a registered Dutch eenmanszaak (sole proprietorship) based in Amsterdam, the Netherlands. KvK and VAT numbers are available on request for invoicing purposes. Email travellayoverlegends@gmail.com.'),
  ('business', 20, 'Do you partner with hotels, airlines, or lounges?',
   'We''re actively looking for partnerships with Schiphol lounges, business travel agencies, and airlines. If you''re interested in a referral arrangement or white-label tour offering, contact travellayoverlegends@gmail.com — we have a partnership program.'),
  -- Other
  ('other', 10, 'What happens if it rains?',
   'Tours run in light rain — Amsterdam locals don''t let weather stop them, and neither do we. We provide umbrellas for guests. In case of severe weather (storm warning, thunderstorm), we may adapt the route to include more indoor stops or reschedule. You''ll be notified by email and phone 2 hours before the tour.'),
  ('other', 20, 'I left something in the vehicle/with the guide. How do I get it back?',
   'Email travellayoverlegends@gmail.com with a description of the item and your booking reference as soon as possible. We hold found items for 30 days. For valuable items (passport, phone, wallet), call us directly and we''ll arrange same-day return to the airport if possible.')
ON CONFLICT DO NOTHING;

-- ── 7. contact_submissions ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.contact_submissions (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT        NOT NULL,
  email                 CITEXT      NOT NULL,
  phone                 TEXT,
  subject               TEXT        NOT NULL
    CHECK (subject IN ('general_inquiry','existing_booking','group_booking',
                       'press','partnership','complaint','compliment','other')),
  message               TEXT        NOT NULL CHECK (length(message) BETWEEN 10 AND 5000),
  ip_address            INET,
  user_agent            TEXT,
  status                TEXT        NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','replied','closed','spam')),
  replied_at            TIMESTAMPTZ,
  replied_by_user_id    UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  internal_notes        TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_status_created
  ON public.contact_submissions(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_email
  ON public.contact_submissions(email);

ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='contact_submissions' AND policyname='contact_admin_all') THEN
    CREATE POLICY contact_admin_all ON public.contact_submissions
      FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
  END IF;
  -- Anyone can submit (INSERT only, no SELECT for public)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='contact_submissions' AND policyname='contact_public_insert') THEN
    CREATE POLICY contact_public_insert ON public.contact_submissions
      FOR INSERT WITH CHECK (TRUE);
  END IF;
END $$;

-- ── 8. contact_rate_limits ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.contact_rate_limits (
  ip_address  INET        PRIMARY KEY,
  count       INT         NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.contact_rate_limits ENABLE ROW LEVEL SECURITY;
-- Service-role only (all contact form logic goes through server actions)

-- ── 9. photos ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.photos (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path  TEXT        NOT NULL UNIQUE,
  cdn_url       TEXT,
  source        TEXT        NOT NULL
    CHECK (source IN ('tour','staff','vehicle','destination','about',
                      'marketing','customer_upload','review')),
  related_id    UUID,
  caption       TEXT,
  alt_text      TEXT        NOT NULL,
  width_px      INT,
  height_px     INT,
  bytes         INT,
  exif_stripped BOOLEAN     NOT NULL DEFAULT TRUE,
  uploaded_by   UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  is_featured   BOOLEAN     NOT NULL DEFAULT FALSE,
  is_public     BOOLEAN     NOT NULL DEFAULT TRUE,
  sort_order    INT         NOT NULL DEFAULT 100,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_photos_source_related
  ON public.photos(source, related_id) WHERE is_public;
CREATE INDEX IF NOT EXISTS idx_photos_featured
  ON public.photos(is_featured, sort_order) WHERE is_featured AND is_public;

ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='photos' AND policyname='photos_public_read') THEN
    CREATE POLICY photos_public_read ON public.photos
      FOR SELECT USING (is_public = TRUE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='photos' AND policyname='photos_admin_all') THEN
    CREATE POLICY photos_admin_all ON public.photos
      FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
  END IF;
  -- Customers can insert review photos (review-photos bucket)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='photos' AND policyname='photos_customer_review_insert') THEN
    CREATE POLICY photos_customer_review_insert ON public.photos
      FOR INSERT WITH CHECK (source = 'customer_upload' AND uploaded_by = auth.uid());
  END IF;
END $$;

-- ── 10. testimonials ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.testimonials (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type       TEXT        NOT NULL
    CHECK (source_type IN ('press','partner','award','customer','featured_review')),
  quote             TEXT        NOT NULL CHECK (length(quote) BETWEEN 20 AND 1000),
  attribution       TEXT        NOT NULL,
  attribution_url   TEXT,
  source_logo_url   TEXT,
  context           TEXT,
  is_active         BOOLEAN     NOT NULL DEFAULT TRUE,
  sort_order        INT         NOT NULL DEFAULT 100,
  language          TEXT        NOT NULL DEFAULT 'en',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_testimonials_active_sort
  ON public.testimonials(is_active, sort_order) WHERE is_active;

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='testimonials' AND policyname='testimonials_public_read') THEN
    CREATE POLICY testimonials_public_read ON public.testimonials
      FOR SELECT USING (is_active = TRUE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='testimonials' AND policyname='testimonials_admin_all') THEN
    CREATE POLICY testimonials_admin_all ON public.testimonials
      FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
  END IF;
END $$;

-- ── 11. site_settings ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.site_settings (
  key                  TEXT        PRIMARY KEY,
  value                TEXT,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by_user_id   UUID        REFERENCES public.users(id) ON DELETE SET NULL
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='site_settings' AND policyname='site_settings_public_read') THEN
    -- Public can read non-sensitive settings (social URLs, KvK)
    CREATE POLICY site_settings_public_read ON public.site_settings
      FOR SELECT USING (TRUE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='site_settings' AND policyname='site_settings_admin_write') THEN
    CREATE POLICY site_settings_admin_write ON public.site_settings
      FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
  END IF;
END $$;

INSERT INTO public.site_settings (key, value) VALUES
  ('social_instagram_url',  NULL),
  ('social_tiktok_url',     NULL),
  ('social_linkedin_url',   NULL),
  ('social_facebook_url',   NULL),
  ('social_youtube_url',    NULL),
  ('kvk_number',            NULL),
  ('vat_number',            NULL),
  ('founder_name',          'Steven Dupont'),
  ('contact_phone',         NULL),
  ('contact_email',         'travellayoverlegends@gmail.com'),
  ('meta_description_en',   'Premium layover tours from Amsterdam Schiphol Airport. Don''t waste your layover.'),
  ('press_kit_url',         NULL),
  ('turnstile_enabled',     'false')
ON CONFLICT DO NOTHING;

-- ── 12. fx_rates ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fx_rates (
  currency_code    CHAR(3)         PRIMARY KEY,
  rate_to_eur      NUMERIC(18,8)   NOT NULL,
  symbol           TEXT            NOT NULL,
  symbol_position  TEXT            NOT NULL DEFAULT 'before'
    CHECK (symbol_position IN ('before','after')),
  decimals         INT             NOT NULL DEFAULT 2,
  is_active        BOOLEAN         NOT NULL DEFAULT TRUE,
  fetched_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

ALTER TABLE public.fx_rates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='fx_rates' AND policyname='fx_rates_public_read') THEN
    CREATE POLICY fx_rates_public_read ON public.fx_rates
      FOR SELECT USING (is_active = TRUE);
  END IF;
  -- Service-role only for writes (cron updates)
END $$;

INSERT INTO public.fx_rates (currency_code, rate_to_eur, symbol, symbol_position, decimals) VALUES
  ('EUR', 1.0,     '€',    'before', 2),
  ('USD', 1.08,    '$',    'before', 2),
  ('GBP', 0.85,    '£',    'before', 2),
  ('CAD', 1.46,    'CA$',  'before', 2),
  ('AUD', 1.65,    'A$',   'before', 2),
  ('JPY', 165.0,   '¥',    'before', 0),
  ('CHF', 0.95,    'CHF',  'before', 2),
  ('CNY', 7.80,    '¥',    'before', 2),
  ('NOK', 11.5,    'kr',   'after',  2),
  ('SEK', 11.6,    'kr',   'after',  2),
  ('DKK', 7.45,    'kr',   'after',  2)
ON CONFLICT DO NOTHING;

-- ── 13. Backfill tours review stats from existing approved reviews ─────────────
UPDATE public.tours t SET
  avg_rating = (
    SELECT ROUND(AVG(rating)::NUMERIC, 2)
    FROM public.reviews WHERE tour_id = t.id AND status = 'approved'
  ),
  reviews_count = (
    SELECT COUNT(*) FROM public.reviews WHERE tour_id = t.id AND status = 'approved'
  ),
  last_review_at = (
    SELECT MAX(created_at) FROM public.reviews WHERE tour_id = t.id AND status = 'approved'
  );

-- ── 14. Sanity-check SELECTs ──────────────────────────────────────────────────
SELECT 'faq_entries'         AS tbl, COUNT(*) FROM public.faq_entries;
SELECT 'contact_submissions' AS tbl, COUNT(*) FROM public.contact_submissions;
SELECT 'photos'              AS tbl, COUNT(*) FROM public.photos;
SELECT 'testimonials'        AS tbl, COUNT(*) FROM public.testimonials;
SELECT 'site_settings'       AS tbl, COUNT(*) FROM public.site_settings;
SELECT 'fx_rates'            AS tbl, COUNT(*) FROM public.fx_rates;
SELECT 'review_request_log'  AS tbl, COUNT(*) FROM public.review_request_log;
SELECT column_name FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'reviews'
    AND column_name IN ('status','tour_id','reviewer_name','operator_response','is_verified_purchase')
  ORDER BY column_name;
SELECT column_name FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'tours'
    AND column_name IN ('avg_rating','reviews_count','last_review_at')
  ORDER BY column_name;
