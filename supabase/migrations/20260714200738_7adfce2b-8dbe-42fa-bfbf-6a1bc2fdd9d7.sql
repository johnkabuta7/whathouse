
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stars smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS show_stars boolean NOT NULL DEFAULT true;

DO $$ BEGIN
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_stars_range CHECK (stars >= 0 AND stars <= 5);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

UPDATE public.profiles SET stars = 5 WHERE account_type = 'agent_premium' AND stars < 5;

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS listings_is_featured_idx ON public.listings(is_featured) WHERE is_featured = true;

CREATE OR REPLACE FUNCTION public.bump_creator_stars()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.profiles
     SET stars = GREATEST(COALESCE(stars, 0), 1)
   WHERE user_id = NEW.created_by AND stars < 1;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_group_bump_creator_stars ON public.groups;
CREATE TRIGGER trg_group_bump_creator_stars
AFTER INSERT ON public.groups
FOR EACH ROW EXECUTE FUNCTION public.bump_creator_stars();

UPDATE public.profiles p
   SET stars = GREATEST(p.stars, 1)
 WHERE EXISTS (SELECT 1 FROM public.groups g WHERE g.created_by = p.user_id)
   AND p.stars < 1;

DROP FUNCTION IF EXISTS public.admin_list_profiles(integer);
CREATE OR REPLACE FUNCTION public.admin_list_profiles(_limit integer DEFAULT 100)
RETURNS TABLE(
  user_id uuid,
  first_name text,
  last_name text,
  phone text,
  email text,
  account_type text,
  stars smallint,
  show_stars boolean,
  is_admin boolean,
  created_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_app_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  RETURN QUERY
    SELECT p.user_id, p.first_name, p.last_name, p.phone, p.email,
           p.account_type, p.stars, p.show_stars,
           public.is_app_admin(p.user_id) AS is_admin,
           p.created_at
      FROM public.profiles p
  ORDER BY public.is_app_admin(p.user_id) DESC,
           (p.account_type = 'agent_premium') DESC,
           p.stars DESC,
           p.created_at DESC
     LIMIT _limit;
END; $$;
REVOKE EXECUTE ON FUNCTION public.admin_list_profiles(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_profiles(integer) TO authenticated;
