
-- Drop the previous views
DROP VIEW IF EXISTS public.profiles_public;
DROP VIEW IF EXISTS public.active_sessions_public;
DROP VIEW IF EXISTS public.listing_like_counts;

-- ============================================================
-- profiles: keep cross-user reads (app depends on them) but hide the password column.
-- ============================================================
DROP POLICY IF EXISTS "Owners and admins can view profile" ON public.profiles;

CREATE POLICY "Authenticated can view profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

REVOKE SELECT (wp_user_password) ON public.profiles FROM PUBLIC, anon, authenticated;

-- ============================================================
-- active_sessions: owner-only base access + SECURITY DEFINER helper for online status
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_online_status(_user_ids uuid[])
RETURNS TABLE(user_id uuid, updated_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.user_id, s.updated_at
  FROM public.active_sessions s
  WHERE s.user_id = ANY(_user_ids);
$$;

REVOKE EXECUTE ON FUNCTION public.get_online_status(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_online_status(uuid[]) TO authenticated;

-- ============================================================
-- listing_likes: owner-only base access + SECURITY DEFINER helper for counts
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_listing_like_counts(_listing_ids uuid[])
RETURNS TABLE(listing_id uuid, count integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l.listing_id, count(*)::int
  FROM public.listing_likes l
  WHERE l.listing_id = ANY(_listing_ids)
  GROUP BY l.listing_id;
$$;

REVOKE EXECUTE ON FUNCTION public.get_listing_like_counts(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_listing_like_counts(uuid[]) TO authenticated;
