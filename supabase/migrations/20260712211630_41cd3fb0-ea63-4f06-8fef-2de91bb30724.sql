CREATE TABLE IF NOT EXISTS public.listing_takes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  taker_id uuid NOT NULL,
  listing_title text,
  listing_image text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (listing_id, taker_id)
);
GRANT SELECT, INSERT ON public.listing_takes TO authenticated;
GRANT ALL ON public.listing_takes TO service_role;
ALTER TABLE public.listing_takes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insert own takes" ON public.listing_takes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = taker_id);
CREATE POLICY "read as owner or taker" ON public.listing_takes
  FOR SELECT TO authenticated
  USING (auth.uid() = owner_id OR auth.uid() = taker_id);
CREATE INDEX IF NOT EXISTS idx_listing_takes_owner ON public.listing_takes(owner_id, created_at DESC);
ALTER PUBLICATION supabase_realtime ADD TABLE public.listing_takes;