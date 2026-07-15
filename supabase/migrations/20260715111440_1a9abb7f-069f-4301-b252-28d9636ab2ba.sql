-- Fix group RLS recursion by moving membership/admin checks into SECURITY DEFINER helpers.

-- Admin helper must bypass user_roles RLS; otherwise admin checks can recurse through policies.
CREATE OR REPLACE FUNCTION public.is_app_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
  )
$$;

-- Safe helpers for RLS policies. They bypass RLS internally and avoid groups <-> group_members recursion.
CREATE OR REPLACE FUNCTION public.is_group_member(_group_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members gm
    WHERE gm.group_id = _group_id
      AND gm.user_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_group_creator(_group_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.groups g
    WHERE g.id = _group_id
      AND g.created_by = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.can_view_group(_group_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    public.is_app_admin(_user_id)
    OR public.is_group_creator(_group_id, _user_id)
    OR public.is_group_member(_group_id, _user_id),
    false
  )
$$;

-- Keep helper execution limited to authenticated app users and backend service.
REVOKE ALL ON FUNCTION public.is_app_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_group_member(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_group_creator(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_view_group(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_app_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_group_creator(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_view_group(uuid, uuid) TO authenticated, service_role;

-- Ensure Data API access remains available; RLS below still controls rows.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.groups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pending_group_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_reads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listings TO authenticated;
GRANT ALL ON public.groups TO service_role;
GRANT ALL ON public.group_members TO service_role;
GRANT ALL ON public.pending_group_members TO service_role;
GRANT ALL ON public.group_reads TO service_role;
GRANT ALL ON public.listings TO service_role;

-- Remove recursive policies.
DROP POLICY IF EXISTS "Members creators admins view groups" ON public.groups;
DROP POLICY IF EXISTS "Users can create groups" ON public.groups;
DROP POLICY IF EXISTS "Creators can update groups" ON public.groups;
DROP POLICY IF EXISTS "Creators can delete groups" ON public.groups;

DROP POLICY IF EXISTS "Same-group members view members" ON public.group_members;
DROP POLICY IF EXISTS "Add members" ON public.group_members;
DROP POLICY IF EXISTS "Remove members" ON public.group_members;

DROP POLICY IF EXISTS "Members view listings" ON public.listings;
DROP POLICY IF EXISTS "Members create listings" ON public.listings;
DROP POLICY IF EXISTS "Update own listings" ON public.listings;
DROP POLICY IF EXISTS "Delete own listings" ON public.listings;

DROP POLICY IF EXISTS "Members view pending members" ON public.pending_group_members;
DROP POLICY IF EXISTS "Group admin add pending members" ON public.pending_group_members;
DROP POLICY IF EXISTS "Group admin delete pending members" ON public.pending_group_members;

-- Groups: creator/admin/member visibility; creator/admin management.
CREATE POLICY "Groups visible to members creators admins"
ON public.groups
FOR SELECT
TO authenticated
USING (public.can_view_group(id, auth.uid()));

CREATE POLICY "Users create own groups"
ON public.groups
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Group creators admins update groups"
ON public.groups
FOR UPDATE
TO authenticated
USING (created_by = auth.uid() OR public.is_app_admin(auth.uid()))
WITH CHECK (created_by = auth.uid() OR public.is_app_admin(auth.uid()));

CREATE POLICY "Group creators admins delete groups"
ON public.groups
FOR DELETE
TO authenticated
USING (created_by = auth.uid() OR public.is_app_admin(auth.uid()));

-- Members: only members/creator/admin can see member list; self can join/leave, creator/admin can manage.
CREATE POLICY "Group members visible inside group"
ON public.group_members
FOR SELECT
TO authenticated
USING (public.can_view_group(group_id, auth.uid()));

CREATE POLICY "Group members can be added safely"
ON public.group_members
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR public.is_group_creator(group_id, auth.uid())
  OR public.is_app_admin(auth.uid())
);

CREATE POLICY "Group members can be removed safely"
ON public.group_members
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_group_creator(group_id, auth.uid())
  OR public.is_app_admin(auth.uid())
);

-- Listings: visible/creatable by group members; admins can see all; owners/admins can update/delete.
CREATE POLICY "Listings visible to members and admins"
ON public.listings
FOR SELECT
TO authenticated
USING (public.is_app_admin(auth.uid()) OR public.is_group_member(group_id, auth.uid()));

CREATE POLICY "Members create group listings"
ON public.listings
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (public.is_group_member(group_id, auth.uid()) OR public.is_app_admin(auth.uid()))
);

CREATE POLICY "Listing owners admins update listings"
ON public.listings
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR public.is_app_admin(auth.uid()))
WITH CHECK (user_id = auth.uid() OR public.is_app_admin(auth.uid()));

CREATE POLICY "Listing owners admins delete listings"
ON public.listings
FOR DELETE
TO authenticated
USING (user_id = auth.uid() OR public.is_app_admin(auth.uid()));

-- Pending/ghost group members: visible and manageable by creator/admin, visible to existing group members.
CREATE POLICY "Pending members visible inside group"
ON public.pending_group_members
FOR SELECT
TO authenticated
USING (public.can_view_group(group_id, auth.uid()));

CREATE POLICY "Group creators admins add pending members"
ON public.pending_group_members
FOR INSERT
TO authenticated
WITH CHECK (
  invited_by = auth.uid()
  AND (public.is_group_creator(group_id, auth.uid()) OR public.is_app_admin(auth.uid()))
);

CREATE POLICY "Group creators admins delete pending members"
ON public.pending_group_members
FOR DELETE
TO authenticated
USING (public.is_group_creator(group_id, auth.uid()) OR public.is_app_admin(auth.uid()));

-- Restore the trigger that makes a newly-created group immediately visible to its creator.
DROP TRIGGER IF EXISTS add_creator_as_group_member ON public.groups;
CREATE TRIGGER add_creator_as_group_member
AFTER INSERT ON public.groups
FOR EACH ROW
EXECUTE FUNCTION public.add_creator_as_member();

-- Backfill any old groups whose creator was not added as a member while the trigger was missing.
INSERT INTO public.group_members (group_id, user_id)
SELECT g.id, g.created_by
FROM public.groups g
WHERE g.created_by IS NOT NULL
ON CONFLICT (group_id, user_id) DO NOTHING;