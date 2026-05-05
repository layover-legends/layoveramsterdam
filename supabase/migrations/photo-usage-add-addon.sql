-- Add 'addon' to photo_usage.entity_type CHECK constraint (applied 2026-05-05).
-- Drop-and-recreate is the only way to change a CHECK constraint in Postgres.
ALTER TABLE public.photo_usage
  DROP CONSTRAINT IF EXISTS photo_usage_entity_type_check;

ALTER TABLE public.photo_usage
  ADD CONSTRAINT photo_usage_entity_type_check
  CHECK (entity_type IN (
    'tour','destination','staff','vehicle','review','testimonial',
    'about_section','hero_slot','social_share','meta_image','article','category',
    'addon'
  ));
