
-- Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check admin
CREATE OR REPLACE FUNCTION public.is_app_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'
  )
$$;

-- RLS for user_roles
CREATE POLICY "Anyone can read roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.is_app_admin(auth.uid()));

-- Slider banners table
CREATE TABLE public.slider_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  link_url text,
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.slider_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active banners" ON public.slider_banners FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage banners" ON public.slider_banners FOR INSERT TO authenticated WITH CHECK (public.is_app_admin(auth.uid()));
CREATE POLICY "Admins update banners" ON public.slider_banners FOR UPDATE TO authenticated USING (public.is_app_admin(auth.uid()));
CREATE POLICY "Admins delete banners" ON public.slider_banners FOR DELETE TO authenticated USING (public.is_app_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_slider_banners_updated_at
BEFORE UPDATE ON public.slider_banners
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime on join requests for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_join_requests;
