
-- Join requests table
CREATE TABLE public.group_join_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  message TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

ALTER TABLE public.group_join_requests ENABLE ROW LEVEL SECURITY;

-- Users can see requests for groups they admin
CREATE POLICY "Admins see join requests" ON public.group_join_requests
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_join_requests.group_id AND g.created_by = auth.uid())
  OR user_id = auth.uid()
);

-- Users can create their own requests
CREATE POLICY "Users create join requests" ON public.group_join_requests
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Admins can update requests (accept/reject)
CREATE POLICY "Admins update join requests" ON public.group_join_requests
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_join_requests.group_id AND g.created_by = auth.uid()));

-- Users can delete their own pending requests
CREATE POLICY "Users delete own requests" ON public.group_join_requests
FOR DELETE TO authenticated
USING (user_id = auth.uid() AND status = 'pending');

CREATE TRIGGER update_group_join_requests_updated_at
BEFORE UPDATE ON public.group_join_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Notification settings table
CREATE TABLE public.notification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  sound_enabled BOOLEAN NOT NULL DEFAULT true,
  sound_type TEXT NOT NULL DEFAULT 'default',
  volume INTEGER NOT NULL DEFAULT 80,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own settings" ON public.notification_settings
FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users insert own settings" ON public.notification_settings
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own settings" ON public.notification_settings
FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER update_notification_settings_updated_at
BEFORE UPDATE ON public.notification_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for listings (for notifications)
ALTER PUBLICATION supabase_realtime ADD TABLE public.listings;
