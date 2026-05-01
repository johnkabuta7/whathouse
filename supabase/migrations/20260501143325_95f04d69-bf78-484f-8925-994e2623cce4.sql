DROP POLICY IF EXISTS "Users view own session" ON public.active_sessions;
CREATE POLICY "Anyone can view active sessions"
ON public.active_sessions
FOR SELECT
TO authenticated
USING (true);