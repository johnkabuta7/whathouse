import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

/**
 * Permalink for a single listing — resolves to its parent group and scrolls to it.
 * URL: /listing/:id
 */
export default function ListingRedirect() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) { navigate('/', { replace: true }); return; }
      const { data } = await supabase.from('listings').select('group_id').eq('id', id).maybeSingle();
      if (cancelled) return;
      if (data?.group_id) navigate(`/group/${data.group_id}#listing-${id}`, { replace: true });
      else navigate('/', { replace: true });
    })();
    return () => { cancelled = true; };
  }, [id, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );
}
