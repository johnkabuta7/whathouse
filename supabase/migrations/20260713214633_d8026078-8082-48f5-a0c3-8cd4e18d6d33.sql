DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.listings; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.group_join_requests; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;