
CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_unique
  ON public.profiles ((LOWER(phone)))
  WHERE phone IS NOT NULL AND phone <> '';

CREATE TABLE IF NOT EXISTS public.active_sessions (
  user_id UUID PRIMARY KEY,
  session_token TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own session" ON public.active_sessions;
CREATE POLICY "Users view own session" ON public.active_sessions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users insert own session" ON public.active_sessions;
CREATE POLICY "Users insert own session" ON public.active_sessions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users update own session" ON public.active_sessions;
CREATE POLICY "Users update own session" ON public.active_sessions
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.active_sessions;
