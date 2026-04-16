
CREATE TABLE public.listing_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(listing_id, user_id)
);

ALTER TABLE public.listing_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own favorites" ON public.listing_favorites FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Add favorites" ON public.listing_favorites FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Remove favorites" ON public.listing_favorites FOR DELETE TO authenticated USING (user_id = auth.uid());

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS background_url text;
