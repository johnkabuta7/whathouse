-- 1. Clean orphan pending invites that point to a deleted group
DELETE FROM public.pending_group_members pgm
WHERE NOT EXISTS (SELECT 1 FROM public.groups g WHERE g.id = pgm.group_id);

-- 2. Make the signup conversion safe against future orphans
CREATE OR REPLACE FUNCTION public.convert_pending_group_members_on_signup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.phone IS NULL OR NEW.phone = '' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.group_members (group_id, user_id)
  SELECT pgm.group_id, NEW.user_id
  FROM public.pending_group_members pgm
  WHERE regexp_replace(pgm.phone, '[^0-9]', '', 'g') = regexp_replace(NEW.phone, '[^0-9]', '', 'g')
    AND EXISTS (SELECT 1 FROM public.groups g WHERE g.id = pgm.group_id)
    AND NOT EXISTS (
      SELECT 1 FROM public.group_members gm WHERE gm.group_id = pgm.group_id AND gm.user_id = NEW.user_id
    );

  DELETE FROM public.pending_group_members
  WHERE regexp_replace(phone, '[^0-9]', '', 'g') = regexp_replace(NEW.phone, '[^0-9]', '', 'g');

  RETURN NEW;
END;
$function$;