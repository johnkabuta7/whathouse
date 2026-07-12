
-- Undo the security-definer view; replace with column-level privacy.
DROP VIEW IF EXISTS public.public_profiles;

-- Restore broad profile row visibility for signed-in users (needed for
-- contacts, group members, public profile displays). Sensitive columns
-- are restricted via column-level GRANTs and helper functions below.
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins view all profiles" ON public.profiles;
CREATE POLICY "Authenticated can view profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Prevent any signed-in / anonymous client from reading the email column
-- directly. Owners and admins read email through dedicated RPCs below.
REVOKE SELECT (email) ON public.profiles FROM authenticated, anon, PUBLIC;

-- Owner can fetch their own email.
CREATE OR REPLACE FUNCTION public.get_my_email()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT email FROM public.profiles WHERE user_id = auth.uid();
$$;
REVOKE EXECUTE ON FUNCTION public.get_my_email() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_email() TO authenticated;

-- Admin-only listing of profiles including email.
CREATE OR REPLACE FUNCTION public.admin_list_profiles(_limit integer DEFAULT 50)
RETURNS TABLE(
  user_id uuid,
  first_name text,
  last_name text,
  phone text,
  email text,
  account_type text,
  created_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_app_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  RETURN QUERY
    SELECT p.user_id, p.first_name, p.last_name, p.phone, p.email, p.account_type, p.created_at
    FROM public.profiles p
    ORDER BY p.created_at DESC
    LIMIT _limit;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_list_profiles(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_profiles(integer) TO authenticated;
