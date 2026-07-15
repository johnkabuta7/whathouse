-- Finalize group stability/security: remove duplicate trigger, secure helper execution, and make discovery respect visibility.

DROP TRIGGER IF EXISTS trg_add_creator_as_member ON public.groups;

DROP FUNCTION IF EXISTS public.list_discoverable_groups();
CREATE FUNCTION public.list_discoverable_groups()
RETURNS TABLE(
  id uuid,
  name text,
  description text,
  image_url text,
  visibility_stars smallint,
  created_by uuid,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT g.id, g.name, g.description, g.image_url, g.visibility_stars::smallint, g.created_by, g.created_at, g.updated_at
  FROM public.groups g
  WHERE auth.uid() IS NOT NULL
    AND public.can_view_group(g.id, auth.uid())
  ORDER BY g.visibility_stars DESC, g.updated_at DESC
$$;

REVOKE EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_group_creator(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_view_group(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_app_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.list_discoverable_groups() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_group_creator(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_view_group(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_app_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_discoverable_groups() TO authenticated, service_role;