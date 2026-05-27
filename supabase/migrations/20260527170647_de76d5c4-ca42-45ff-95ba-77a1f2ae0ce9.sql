
-- 1. Unique constraint for upsert
ALTER TABLE public.imported_contacts
  ADD CONSTRAINT imported_contacts_user_phone_unique UNIQUE (user_id, contact_phone);

-- 2. Normalize phones in profiles (strip spaces & non-digits, add leading +)
UPDATE public.profiles
SET phone = CASE
  WHEN phone IS NULL OR phone = '' THEN phone
  WHEN phone LIKE '+%' THEN '+' || regexp_replace(substring(phone from 2), '[^0-9]', '', 'g')
  ELSE '+' || regexp_replace(phone, '[^0-9]', '', 'g')
END
WHERE phone IS NOT NULL AND phone <> '';

-- 3. Helper to seed mandatory contacts for a user
CREATE OR REPLACE FUNCTION public.add_mandatory_contacts(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.imported_contacts (user_id, contact_phone, contact_name, status)
  VALUES
    (_user_id, '+243851987307', 'Aise Lu''za', 'confirmed'),
    (_user_id, '+33683331506',  'Immo kabuth', 'confirmed')
  ON CONFLICT (user_id, contact_phone) DO NOTHING;
END;
$$;

-- 4. Update signup trigger to also seed mandatory contacts
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  raw_phone text;
  norm_phone text;
  raw_wp_user_id text;
BEGIN
  raw_phone := COALESCE(NEW.raw_user_meta_data->>'phone', '');
  norm_phone := CASE WHEN raw_phone <> '' THEN '+' || regexp_replace(raw_phone, '[^0-9]', '', 'g') ELSE '' END;
  raw_wp_user_id := COALESCE(NEW.raw_user_meta_data->>'wp_user_id', '');

  INSERT INTO public.profiles (user_id, first_name, last_name, phone, email, wp_user_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    norm_phone,
    CASE
      WHEN COALESCE(NEW.email, '') = '' OR NEW.email LIKE 'phone_%@whathouse.app' THEN NULL
      ELSE lower(NEW.email)
    END,
    CASE WHEN raw_wp_user_id ~ '^[0-9]+$' THEN raw_wp_user_id::integer ELSE NULL END
  );

  PERFORM public.add_mandatory_contacts(NEW.id);
  RETURN NEW;
END;
$function$;

-- Make sure trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Backfill mandatory contacts for every existing user
INSERT INTO public.imported_contacts (user_id, contact_phone, contact_name, status)
SELECT user_id, '+243851987307', 'Aise Lu''za', 'confirmed' FROM public.profiles
ON CONFLICT (user_id, contact_phone) DO NOTHING;

INSERT INTO public.imported_contacts (user_id, contact_phone, contact_name, status)
SELECT user_id, '+33683331506', 'Immo kabuth', 'confirmed' FROM public.profiles
ON CONFLICT (user_id, contact_phone) DO NOTHING;
