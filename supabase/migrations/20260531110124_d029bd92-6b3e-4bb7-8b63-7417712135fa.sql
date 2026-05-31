
-- On new profile, auto-confirm pending imports matching this phone
-- and create reverse imports so importers appear in the new user's repertoire.
CREATE OR REPLACE FUNCTION public.link_pending_contacts_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  importer record;
  new_name text;
BEGIN
  IF NEW.phone IS NULL OR NEW.phone = '' THEN
    RETURN NEW;
  END IF;

  new_name := trim(coalesce(NEW.first_name,'') || ' ' || coalesce(NEW.last_name,''));

  -- Mark all imports of this phone as confirmed
  UPDATE public.imported_contacts
    SET status = 'confirmed', updated_at = now()
    WHERE contact_phone = NEW.phone AND status <> 'confirmed';

  -- For every user who imported this phone, create a reverse import for the new user
  FOR importer IN
    SELECT DISTINCT ic.user_id, p.first_name, p.last_name, p.phone
      FROM public.imported_contacts ic
      JOIN public.profiles p ON p.user_id = ic.user_id
      WHERE ic.contact_phone = NEW.phone AND ic.user_id <> NEW.user_id
  LOOP
    IF importer.phone IS NOT NULL AND importer.phone <> '' THEN
      INSERT INTO public.imported_contacts (user_id, contact_phone, contact_name, status)
        VALUES (NEW.user_id, importer.phone,
                trim(coalesce(importer.first_name,'') || ' ' || coalesce(importer.last_name,'')),
                'confirmed')
        ON CONFLICT (user_id, contact_phone) DO UPDATE SET status = 'confirmed';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS link_pending_contacts_on_signup_trigger ON public.profiles;
CREATE TRIGGER link_pending_contacts_on_signup_trigger
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.link_pending_contacts_on_signup();

-- Helper RPC: cascade-delete a group and all its child rows (only the creator can call it via RLS on groups)
CREATE OR REPLACE FUNCTION public.delete_group_cascade(_group_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.groups
    WHERE id = _group_id
      AND (created_by = auth.uid() OR public.is_app_admin(auth.uid()))
  ) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  DELETE FROM public.listing_likes
    WHERE listing_id IN (SELECT id FROM public.listings WHERE group_id = _group_id);
  DELETE FROM public.listing_favorites
    WHERE listing_id IN (SELECT id FROM public.listings WHERE group_id = _group_id);
  DELETE FROM public.listings WHERE group_id = _group_id;
  DELETE FROM public.group_members WHERE group_id = _group_id;
  DELETE FROM public.group_join_requests WHERE group_id = _group_id;
  DELETE FROM public.group_reads WHERE group_id = _group_id;
  DELETE FROM public.groups WHERE id = _group_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_group_cascade(uuid) TO authenticated;
