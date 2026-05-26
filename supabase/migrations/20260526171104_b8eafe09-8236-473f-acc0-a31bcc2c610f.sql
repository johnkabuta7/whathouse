CREATE TABLE public.imported_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  contact_phone text NOT NULL,
  contact_name text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'confirmed',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, contact_phone)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.imported_contacts TO authenticated;
GRANT ALL ON public.imported_contacts TO service_role;

ALTER TABLE public.imported_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own imported contacts" ON public.imported_contacts
FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users insert own imported contacts" ON public.imported_contacts
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own imported contacts" ON public.imported_contacts
FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users delete own imported contacts" ON public.imported_contacts
FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX idx_imported_contacts_user ON public.imported_contacts (user_id);
CREATE INDEX idx_imported_contacts_phone ON public.imported_contacts (contact_phone);

-- Allow anonymous (logged-out) visitors to view slider banners
DROP POLICY IF EXISTS "Anyone can view active banners" ON public.slider_banners;
CREATE POLICY "Anyone can view active banners" ON public.slider_banners
FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON public.slider_banners TO anon;