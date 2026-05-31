-- Ghost mode flag on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ghost_mode boolean NOT NULL DEFAULT false;

-- Pending (ghost) group members: rows for contacts not yet registered
CREATE TABLE IF NOT EXISTS public.pending_group_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid NOT NULL,
  phone text NOT NULL,
  name text NOT NULL DEFAULT '',
  invited_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, phone)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pending_group_members TO authenticated;
GRANT ALL ON public.pending_group_members TO service_role;

ALTER TABLE public.pending_group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view pending members"
ON public.pending_group_members FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = pending_group_members.group_id AND gm.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.groups g WHERE g.id = pending_group_members.group_id AND g.created_by = auth.uid())
);

CREATE POLICY "Group admin add pending members"
ON public.pending_group_members FOR INSERT TO authenticated
WITH CHECK (
  invited_by = auth.uid() AND
  EXISTS (SELECT 1 FROM public.groups g WHERE g.id = pending_group_members.group_id AND g.created_by = auth.uid())
);

CREATE POLICY "Group admin delete pending members"
ON public.pending_group_members FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.groups g WHERE g.id = pending_group_members.group_id AND g.created_by = auth.uid())
);

-- On new profile creation, convert any pending_group_members matching phone -> real group_members
CREATE OR REPLACE FUNCTION public.convert_pending_group_members_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.phone IS NULL OR NEW.phone = '' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.group_members (group_id, user_id)
  SELECT pgm.group_id, NEW.user_id
  FROM public.pending_group_members pgm
  WHERE regexp_replace(pgm.phone, '[^0-9]', '', 'g') = regexp_replace(NEW.phone, '[^0-9]', '', 'g')
    AND NOT EXISTS (
      SELECT 1 FROM public.group_members gm WHERE gm.group_id = pgm.group_id AND gm.user_id = NEW.user_id
    );

  DELETE FROM public.pending_group_members
  WHERE regexp_replace(phone, '[^0-9]', '', 'g') = regexp_replace(NEW.phone, '[^0-9]', '', 'g');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS convert_pending_members_trigger ON public.profiles;
CREATE TRIGGER convert_pending_members_trigger
AFTER INSERT OR UPDATE OF phone ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.convert_pending_group_members_on_signup();