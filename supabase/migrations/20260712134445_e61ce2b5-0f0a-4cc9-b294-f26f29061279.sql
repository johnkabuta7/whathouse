
-- =========================================================================
-- Unify Android + Web WhatHouse on a single Supabase source of truth
-- Migration path (informational): supabase/migrations/20260712090000_unify_android_web_social_data.sql
-- =========================================================================

-- 1) Helper: normalize a phone to its last 9 digits (or empty when too short)
CREATE OR REPLACE FUNCTION public.normalize_phone_tail(_phone text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN _phone IS NULL THEN ''
    WHEN length(regexp_replace(_phone, '[^0-9]', '', 'g')) < 9 THEN ''
    ELSE right(regexp_replace(_phone, '[^0-9]', '', 'g'), 9)
  END;
$$;

-- 2) Trigger: auto-add the creator as a member on group insert (idempotent)
CREATE OR REPLACE FUNCTION public.add_creator_as_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS NOT NULL THEN
    INSERT INTO public.group_members (group_id, user_id)
    VALUES (NEW.id, NEW.created_by)
    ON CONFLICT (group_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_add_creator_as_member ON public.groups;
CREATE TRIGGER trg_add_creator_as_member
AFTER INSERT ON public.groups
FOR EACH ROW
EXECUTE FUNCTION public.add_creator_as_member();

-- 3) Backfill: repair any existing group where creator isn't a member
INSERT INTO public.group_members (group_id, user_id)
SELECT g.id, g.created_by
FROM public.groups g
WHERE g.created_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = g.id AND gm.user_id = g.created_by
  )
ON CONFLICT (group_id, user_id) DO NOTHING;

-- 4) Improve convert_pending_group_members_on_signup: compare on last-9-digits
CREATE OR REPLACE FUNCTION public.convert_pending_group_members_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tail text;
BEGIN
  tail := public.normalize_phone_tail(NEW.phone);
  IF tail = '' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.group_members (group_id, user_id)
  SELECT pgm.group_id, NEW.user_id
  FROM public.pending_group_members pgm
  WHERE public.normalize_phone_tail(pgm.phone) = tail
    AND EXISTS (SELECT 1 FROM public.groups g WHERE g.id = pgm.group_id)
  ON CONFLICT (group_id, user_id) DO NOTHING;

  DELETE FROM public.pending_group_members pgm
  WHERE public.normalize_phone_tail(pgm.phone) = tail;

  RETURN NEW;
END;
$$;

-- 5) Also convert pending invites when an existing profile's phone changes
CREATE OR REPLACE FUNCTION public.convert_pending_on_phone_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tail text;
BEGIN
  IF COALESCE(NEW.phone,'') = COALESCE(OLD.phone,'') THEN
    RETURN NEW;
  END IF;
  tail := public.normalize_phone_tail(NEW.phone);
  IF tail = '' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.group_members (group_id, user_id)
  SELECT pgm.group_id, NEW.user_id
  FROM public.pending_group_members pgm
  WHERE public.normalize_phone_tail(pgm.phone) = tail
    AND EXISTS (SELECT 1 FROM public.groups g WHERE g.id = pgm.group_id)
  ON CONFLICT (group_id, user_id) DO NOTHING;

  DELETE FROM public.pending_group_members pgm
  WHERE public.normalize_phone_tail(pgm.phone) = tail;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_convert_pending_on_phone_change ON public.profiles;
CREATE TRIGGER trg_convert_pending_on_phone_change
AFTER UPDATE OF phone ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.convert_pending_on_phone_change();

-- 6) Ensure the signup-time trigger is present on profile insert
DROP TRIGGER IF EXISTS trg_convert_pending_on_signup ON public.profiles;
CREATE TRIGGER trg_convert_pending_on_signup
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.convert_pending_group_members_on_signup();

-- 7) Sweep: convert any orphan pending invites that already match an existing profile
INSERT INTO public.group_members (group_id, user_id)
SELECT pgm.group_id, p.user_id
FROM public.pending_group_members pgm
JOIN public.profiles p
  ON public.normalize_phone_tail(p.phone) = public.normalize_phone_tail(pgm.phone)
 AND public.normalize_phone_tail(p.phone) <> ''
WHERE EXISTS (SELECT 1 FROM public.groups g WHERE g.id = pgm.group_id)
ON CONFLICT (group_id, user_id) DO NOTHING;

DELETE FROM public.pending_group_members pgm
WHERE EXISTS (
  SELECT 1 FROM public.profiles p
  WHERE public.normalize_phone_tail(p.phone) = public.normalize_phone_tail(pgm.phone)
    AND public.normalize_phone_tail(p.phone) <> ''
);

-- 8) Lock down helper: no direct exec by clients
REVOKE EXECUTE ON FUNCTION public.add_creator_as_member() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.convert_pending_on_phone_change() FROM PUBLIC, anon, authenticated;
