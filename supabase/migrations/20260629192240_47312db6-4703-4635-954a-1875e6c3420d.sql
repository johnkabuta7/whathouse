
-- 1. profiles: hide wp_user_password from anon/authenticated; only service_role can read it
REVOKE SELECT (wp_user_password) ON public.profiles FROM authenticated, anon;
REVOKE UPDATE (wp_user_password) ON public.profiles FROM authenticated, anon;

-- 2. active_sessions: hide session_token; user_id+updated_at remain readable for online status
REVOKE SELECT (session_token) ON public.active_sessions FROM authenticated, anon;

-- 3. user_roles: restrict SELECT to owner
DROP POLICY IF EXISTS "Anyone can read roles" ON public.user_roles;
CREATE POLICY "Users read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- 4. listings: drop anon from public read policy (keep authenticated)
DROP POLICY IF EXISTS "Public can view listings" ON public.listings;
CREATE POLICY "Authenticated can view listings" ON public.listings
  FOR SELECT TO authenticated USING (true);

-- 5. storage.objects — documents bucket: enforce ownership on SELECT and INSERT
DROP POLICY IF EXISTS "Authenticated users can view documents" ON storage.objects;
CREATE POLICY "Users can view own documents" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'documents' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
CREATE POLICY "Users can upload own documents" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- 6. storage.objects — listings bucket: enforce ownership on DELETE; restrict listing-the-bucket SELECT to owner (files remain accessible via public URL)
DROP POLICY IF EXISTS "Delete listing images" ON storage.objects;
CREATE POLICY "Users can delete own listing images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'listings' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Authenticated users can view listing images" ON storage.objects;
CREATE POLICY "Users can list own listing images" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'listings' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- 7. Revoke EXECUTE on trigger-only SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.add_mandatory_contacts(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_admin_role() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.link_pending_contacts_on_signup() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.convert_pending_group_members_on_signup() FROM PUBLIC, anon, authenticated;
-- Client-callable: accept_collaboration_request and delete_group_cascade — keep EXECUTE for authenticated only
REVOKE EXECUTE ON FUNCTION public.accept_collaboration_request(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.delete_group_cascade(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_collaboration_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_group_cascade(uuid) TO authenticated;

-- 8. realtime.messages — restrict subscriptions: deny by default for clients
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can receive broadcasts" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated users can send broadcasts" ON realtime.messages;
CREATE POLICY "Block direct realtime messages for clients" ON realtime.messages
  FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);
