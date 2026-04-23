ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS wp_user_id integer,
  ADD COLUMN IF NOT EXISTS wp_user_password text;

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS wp_post_id integer,
  ADD COLUMN IF NOT EXISTS wp_media_ids integer[];

CREATE INDEX IF NOT EXISTS idx_profiles_wp_user_id ON public.profiles(wp_user_id);
CREATE INDEX IF NOT EXISTS idx_listings_wp_post_id ON public.listings(wp_post_id);