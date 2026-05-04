ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email text;

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
    CASE
      WHEN raw_wp_user_id ~ '^[0-9]+$' THEN raw_wp_user_id::integer
      ELSE NULL
    END
  );
  RETURN NEW;
END;
$function$;