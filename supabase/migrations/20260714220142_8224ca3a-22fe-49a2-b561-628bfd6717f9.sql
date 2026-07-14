
-- 1) profiles: hide email column from Data API. Owner reads own email via get_my_email() RPC; admin uses admin_list_profiles RPC.
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, user_id, first_name, last_name, phone, avatar_url, background_url, wp_user_id, account_type, ghost_mode, stars, show_stars, created_at, updated_at)
  ON public.profiles TO authenticated;

-- 2) active_sessions: remove from realtime publication (session tokens must never broadcast)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'active_sessions'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.active_sessions';
  END IF;
END $$;

-- 3) groups: restrict SELECT; expose discovery via safe view
DROP POLICY IF EXISTS "Anyone authenticated can view groups" ON public.groups;
CREATE POLICY "Members creators admins view groups"
  ON public.groups FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR public.is_app_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = groups.id AND gm.user_id = auth.uid())
  );

CREATE OR REPLACE VIEW public.groups_public
  WITH (security_invoker = off) AS
  SELECT id, name, description, image_url, visibility_stars, created_by, created_at, updated_at
  FROM public.groups;
GRANT SELECT ON public.groups_public TO authenticated;

-- 4) group_members: restrict to same-group members / creators / admins
DROP POLICY IF EXISTS "View group members" ON public.group_members;
CREATE POLICY "Same-group members view members"
  ON public.group_members FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_app_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_members.group_id AND g.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM public.group_members gm2 WHERE gm2.group_id = group_members.group_id AND gm2.user_id = auth.uid())
  );

-- 5) wp_credentials: enable RLS + owner-only policies (edge functions still access via service_role)
ALTER TABLE public.wp_credentials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner select wp_credentials" ON public.wp_credentials;
DROP POLICY IF EXISTS "Owner insert wp_credentials" ON public.wp_credentials;
DROP POLICY IF EXISTS "Owner update wp_credentials" ON public.wp_credentials;
DROP POLICY IF EXISTS "Owner delete wp_credentials" ON public.wp_credentials;
CREATE POLICY "Owner select wp_credentials" ON public.wp_credentials FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Owner insert wp_credentials" ON public.wp_credentials FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owner update wp_credentials" ON public.wp_credentials FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owner delete wp_credentials" ON public.wp_credentials FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 6) SECURITY DEFINER functions: prevent anonymous execution; keep authenticated where needed
REVOKE EXECUTE ON FUNCTION public.get_my_email() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_listing_like_counts(uuid[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_online_status(uuid[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_profiles(integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.accept_collaboration_request(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.delete_group_cascade(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_app_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.normalize_phone_tail(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.add_mandatory_contacts(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_email() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_listing_like_counts(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_online_status(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_profiles(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_collaboration_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_group_cascade(uuid) TO authenticated;
