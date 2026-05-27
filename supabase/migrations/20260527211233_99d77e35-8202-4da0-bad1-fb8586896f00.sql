
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'agent';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='Admins can update any profile') THEN
    CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE TO authenticated USING (public.is_app_admin(auth.uid())) WITH CHECK (public.is_app_admin(auth.uid()));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.sync_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.account_type = 'admin' THEN
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.user_id AND role = 'admin') THEN
      INSERT INTO public.user_roles(user_id, role) VALUES (NEW.user_id, 'admin');
    END IF;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = NEW.user_id AND role = 'admin';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_admin_role_trigger ON public.profiles;
CREATE TRIGGER sync_admin_role_trigger
AFTER INSERT OR UPDATE OF account_type ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_admin_role();

-- Backfill: existing admins (in user_roles) keep admin account_type
UPDATE public.profiles p SET account_type = 'admin'
WHERE EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.user_id AND ur.role = 'admin')
  AND p.account_type <> 'admin';
