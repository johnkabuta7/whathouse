
-- Drop the security-definer view (linter flag) and replace with a security-definer function
DROP VIEW IF EXISTS public.groups_public;

CREATE OR REPLACE FUNCTION public.list_discoverable_groups()
RETURNS TABLE(
  id uuid,
  name text,
  description text,
  image_url text,
  visibility_stars smallint,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT g.id, g.name, g.description, g.image_url, g.visibility_stars, g.created_by, g.created_at, g.updated_at
  FROM public.groups g
$$;

REVOKE ALL ON FUNCTION public.list_discoverable_groups() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_discoverable_groups() TO authenticated;

-- Revoke EXECUTE on trigger-only SECURITY DEFINER helpers so they cannot be called from the API
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_creator_stars() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.convert_pending_on_phone_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.convert_pending_group_members_on_signup() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.link_pending_contacts_on_signup() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.add_creator_as_member() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_admin_role() FROM PUBLIC, anon, authenticated;
