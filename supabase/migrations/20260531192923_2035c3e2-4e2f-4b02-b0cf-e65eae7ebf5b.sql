ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS visibility_stars INTEGER NOT NULL DEFAULT 1
  CHECK (visibility_stars BETWEEN 1 AND 3);

CREATE INDEX IF NOT EXISTS idx_groups_visibility_stars ON public.groups (visibility_stars DESC, updated_at DESC);