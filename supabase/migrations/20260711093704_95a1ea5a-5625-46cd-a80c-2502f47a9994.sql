
-- ============================================================
-- 1) profiles: owner+admin read on base; safe public view for cross-user reads
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;

CREATE POLICY "Owners and admins can view profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_app_admin(auth.uid()));

DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public
WITH (security_invoker = off) AS
SELECT
  id,
  user_id,
  first_name,
  last_name,
  phone,
  avatar_url,
  background_url,
  account_type,
  ghost_mode,
  created_at,
  updated_at
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO authenticated;

-- ============================================================
-- 2) active_sessions: only owner reads the token; public view for online status
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view active sessions" ON public.active_sessions;

CREATE POLICY "Users view own session"
  ON public.active_sessions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP VIEW IF EXISTS public.active_sessions_public;
CREATE VIEW public.active_sessions_public
WITH (security_invoker = off) AS
SELECT user_id, updated_at
FROM public.active_sessions;

GRANT SELECT ON public.active_sessions_public TO authenticated;

-- ============================================================
-- 3) listing_likes: only owner rows visible; aggregate counts via public view
-- ============================================================
DROP POLICY IF EXISTS "View likes" ON public.listing_likes;

CREATE POLICY "Users view own likes"
  ON public.listing_likes FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP VIEW IF EXISTS public.listing_like_counts;
CREATE VIEW public.listing_like_counts
WITH (security_invoker = off) AS
SELECT listing_id, count(*)::int AS count
FROM public.listing_likes
GROUP BY listing_id;

GRANT SELECT ON public.listing_like_counts TO authenticated;

-- ============================================================
-- 4) Storage — listings bucket: scope INSERT + UPDATE to owner folder
-- ============================================================
DROP POLICY IF EXISTS "Upload listing images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own listing images" ON storage.objects;

CREATE POLICY "Users can upload own listing images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'listings'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own listing images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'listings'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'listings'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- ============================================================
-- 5) Storage — documents bucket: add UPDATE policy scoped to owner folder
-- ============================================================
DROP POLICY IF EXISTS "Users can update own documents" ON storage.objects;

CREATE POLICY "Users can update own documents"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'documents'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- ============================================================
-- 6) Revoke EXECUTE from signed-in users on trigger-only SECURITY DEFINER funcs
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.convert_pending_group_members_on_signup() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.add_mandatory_contacts(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_admin_role() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.link_pending_contacts_on_signup() FROM PUBLIC, anon, authenticated;
