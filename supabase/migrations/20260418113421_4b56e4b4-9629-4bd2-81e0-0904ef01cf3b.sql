
ALTER TABLE public.slider_banners ADD COLUMN IF NOT EXISTS caption TEXT DEFAULT '';

CREATE TABLE IF NOT EXISTS public.app_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.app_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view app content" ON public.app_content;
CREATE POLICY "Anyone can view app content" ON public.app_content FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins insert app content" ON public.app_content;
CREATE POLICY "Admins insert app content" ON public.app_content FOR INSERT TO authenticated WITH CHECK (public.is_app_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins update app content" ON public.app_content;
CREATE POLICY "Admins update app content" ON public.app_content FOR UPDATE TO authenticated USING (public.is_app_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins delete app content" ON public.app_content;
CREATE POLICY "Admins delete app content" ON public.app_content FOR DELETE TO authenticated USING (public.is_app_admin(auth.uid()));
