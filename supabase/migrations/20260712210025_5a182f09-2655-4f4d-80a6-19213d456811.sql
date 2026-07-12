
-- 1. Move plaintext WordPress password out of profiles into a service-role-only table
CREATE TABLE IF NOT EXISTS public.wp_credentials (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  wp_app_password text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.wp_credentials TO service_role;
ALTER TABLE public.wp_credentials ENABLE ROW LEVEL SECURITY;
-- No policies -> only service_role (bypasses RLS) can read/write.

INSERT INTO public.wp_credentials (user_id, wp_app_password, updated_at)
SELECT user_id, wp_user_password, now() FROM public.profiles
WHERE wp_user_password IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

ALTER TABLE public.profiles DROP COLUMN IF EXISTS wp_user_password;

-- 2. Restrict base profiles SELECT to owner + admins
DROP POLICY IF EXISTS "Authenticated can view profiles" ON public.profiles;
CREATE POLICY "Users view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Admins view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_app_admin(auth.uid()));

-- 3. Safe cross-user view exposing only non-sensitive columns
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT user_id, first_name, last_name, avatar_url, background_url, phone, account_type, ghost_mode
FROM public.profiles;
ALTER VIEW public.public_profiles SET (security_invoker = false);
GRANT SELECT ON public.public_profiles TO authenticated, anon;

-- 4. Remove permissive listings SELECT policy so only group members can view listings
DROP POLICY IF EXISTS "Authenticated can view listings" ON public.listings;

-- 5. Harden SECURITY DEFINER RPCs still executable by signed-in users:
--    add explicit auth check so anonymous calls can't invoke them.
CREATE OR REPLACE FUNCTION public.get_listing_like_counts(_listing_ids uuid[])
RETURNS TABLE(listing_id uuid, count integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  RETURN QUERY
    SELECT l.listing_id, count(*)::int
    FROM public.listing_likes l
    WHERE l.listing_id = ANY(_listing_ids)
    GROUP BY l.listing_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_online_status(_user_ids uuid[])
RETURNS TABLE(user_id uuid, updated_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  RETURN QUERY
    SELECT s.user_id, s.updated_at
    FROM public.active_sessions s
    WHERE s.user_id = ANY(_user_ids);
END;
$$;

-- Revoke broad execute; grant only to signed-in role.
REVOKE EXECUTE ON FUNCTION public.get_listing_like_counts(uuid[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_online_status(uuid[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.accept_collaboration_request(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.delete_group_cascade(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_listing_like_counts(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_online_status(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_collaboration_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_group_cascade(uuid) TO authenticated;
