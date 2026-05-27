
CREATE TABLE public.collaboration_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL,
  to_user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (from_user_id, to_user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.collaboration_requests TO authenticated;
GRANT ALL ON public.collaboration_requests TO service_role;

ALTER TABLE public.collaboration_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Both parties view requests"
  ON public.collaboration_requests FOR SELECT TO authenticated
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

CREATE POLICY "Sender create requests"
  ON public.collaboration_requests FOR INSERT TO authenticated
  WITH CHECK (from_user_id = auth.uid() AND to_user_id <> auth.uid());

CREATE POLICY "Recipient update status"
  ON public.collaboration_requests FOR UPDATE TO authenticated
  USING (to_user_id = auth.uid());

CREATE POLICY "Sender cancel pending"
  ON public.collaboration_requests FOR DELETE TO authenticated
  USING (from_user_id = auth.uid() AND status = 'pending');

CREATE TRIGGER trg_collab_req_updated
  BEFORE UPDATE ON public.collaboration_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.collaboration_requests;

-- Accept request: adds both users to each other's imported_contacts
CREATE OR REPLACE FUNCTION public.accept_collaboration_request(_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req record;
  from_profile record;
  to_profile record;
BEGIN
  SELECT * INTO req FROM public.collaboration_requests
    WHERE id = _request_id AND to_user_id = auth.uid() AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or not allowed';
  END IF;

  UPDATE public.collaboration_requests
    SET status = 'accepted', updated_at = now()
    WHERE id = _request_id;

  SELECT user_id, first_name, last_name, phone INTO from_profile
    FROM public.profiles WHERE user_id = req.from_user_id;
  SELECT user_id, first_name, last_name, phone INTO to_profile
    FROM public.profiles WHERE user_id = req.to_user_id;

  IF from_profile.phone IS NOT NULL AND from_profile.phone <> '' THEN
    INSERT INTO public.imported_contacts (user_id, contact_phone, contact_name, status)
      VALUES (req.to_user_id, from_profile.phone,
              trim(coalesce(from_profile.first_name,'') || ' ' || coalesce(from_profile.last_name,'')),
              'confirmed')
      ON CONFLICT (user_id, contact_phone) DO UPDATE SET status='confirmed';
  END IF;
  IF to_profile.phone IS NOT NULL AND to_profile.phone <> '' THEN
    INSERT INTO public.imported_contacts (user_id, contact_phone, contact_name, status)
      VALUES (req.from_user_id, to_profile.phone,
              trim(coalesce(to_profile.first_name,'') || ' ' || coalesce(to_profile.last_name,'')),
              'confirmed')
      ON CONFLICT (user_id, contact_phone) DO UPDATE SET status='confirmed';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_collaboration_request(uuid) TO authenticated;
