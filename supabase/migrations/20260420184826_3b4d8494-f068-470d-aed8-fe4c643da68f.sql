-- Delete the duplicate broken account (kept the older one)
DELETE FROM auth.users WHERE id = '9b6d3b9b-13f2-40f2-879c-cc6f5eba033f';
DELETE FROM public.profiles WHERE user_id = '9b6d3b9b-13f2-40f2-879c-cc6f5eba033f';

-- Normalize all existing phone numbers to digits-only with leading +
UPDATE public.profiles
SET phone = '+' || regexp_replace(phone, '[^0-9]', '', 'g')
WHERE phone IS NOT NULL AND phone <> '' AND phone !~ '^\+[0-9]+$';

-- Update unique index based on normalized digits
DROP INDEX IF EXISTS public.profiles_phone_unique;
CREATE UNIQUE INDEX profiles_phone_unique
  ON public.profiles ((regexp_replace(phone, '[^0-9]', '', 'g')))
  WHERE phone IS NOT NULL AND phone <> '';

-- Update handle_new_user to normalize phone on insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  raw_phone text;
  norm_phone text;
BEGIN
  raw_phone := COALESCE(NEW.raw_user_meta_data->>'phone', '');
  norm_phone := CASE WHEN raw_phone <> '' THEN '+' || regexp_replace(raw_phone, '[^0-9]', '', 'g') ELSE '' END;
  INSERT INTO public.profiles (user_id, first_name, last_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    norm_phone
  );
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();