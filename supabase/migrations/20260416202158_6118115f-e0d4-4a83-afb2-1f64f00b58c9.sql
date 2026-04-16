CREATE TABLE IF NOT EXISTS public.group_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, group_id)
);

ALTER TABLE public.group_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own reads" ON public.group_reads FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Insert own reads" ON public.group_reads FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Update own reads" ON public.group_reads FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Delete own reads" ON public.group_reads FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_group_reads_user_group ON public.group_reads(user_id, group_id);