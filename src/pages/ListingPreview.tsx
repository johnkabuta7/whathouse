import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, MessageCircle, ExternalLink, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Public preview of a single listing.
 * URL: /listing/:id  → opens WhatHouse with images + description in full preview.
 * Works for non-authenticated users (e.g. when opened from a WhatsApp link).
 */
export default function ListingPreview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [listing, setListing] = useState<any | null>(null);
  const [owner, setOwner] = useState<any | null>(null);
  const [group, setGroup] = useState<any | null>(null);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) { setNotFound(true); setLoading(false); return; }
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) { setNotFound(true); setLoading(false); return; }
      setListing(data);
      const [{ data: prof }, { data: grp }] = await Promise.all([
        data.user_id ? supabase.from('profiles').select('first_name,last_name,avatar_url,phone').eq('id', data.user_id).maybeSingle() : Promise.resolve({ data: null } as any),
        data.group_id ? supabase.from('groups').select('id,name,image_url').eq('id', data.group_id).maybeSingle() : Promise.resolve({ data: null } as any),
      ]);
      if (cancelled) return;
      setOwner(prof);
      setGroup(grp);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !listing) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background p-6 text-center">
        <p className="text-sm text-muted-foreground mb-4">Cette annonce n'est plus disponible.</p>
        <Link to="/" className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold">Retour à l'accueil</Link>
      </div>
    );
  }

  const images: string[] = listing.images || [];
  const agentName = `${owner?.first_name || ''} ${owner?.last_name || ''}`.trim() || 'Agent';
  const zwandakoHref = listing.zwandako_url || (listing.wp_post_id ? `https://zwandako.com/?p=${listing.wp_post_id}` : null);
  const ownerPhone = owner?.phone?.replace(/[^0-9]/g, '');
  const waMessage = `Bonjour, je vous contacte au sujet de votre annonce "${listing.title}" : ${window.location.href}`;

  return (
    <div className="min-h-[100dvh] bg-background pb-24" data-no-swipe>
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border flex items-center gap-2 px-3 py-2">
        <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-muted">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate text-foreground">{listing.title}</p>
          <p className="text-[11px] text-muted-foreground truncate">Aperçu de l'annonce</p>
        </div>
      </div>

      {images.length > 0 && (
        <div className="relative bg-black">
          <img src={images[idx]} alt={listing.title} className="w-full h-72 object-contain" />
          {images.length > 1 && (
            <>
              <button onClick={() => setIdx((idx - 1 + images.length) % images.length)}
                className="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-foreground/40 text-background flex items-center justify-center">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button onClick={() => setIdx((idx + 1) % images.length)}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-foreground/40 text-background flex items-center justify-center">
                <ChevronRight className="h-5 w-5" />
              </button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-foreground/60 text-background text-[10px] font-bold px-2 py-0.5 rounded-lg">
                {idx + 1}/{images.length}
              </div>
            </>
          )}
        </div>
      )}

      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
            {owner?.avatar_url ? <img src={owner.avatar_url} className="h-full w-full object-cover" /> : <Users className="h-5 w-5 text-primary" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{agentName}</p>
            {group && <p className="text-[11px] text-muted-foreground truncate">dans « {group.name} »</p>}
          </div>
        </div>

        <h1 className="text-lg font-bold text-foreground">{listing.title}</h1>
        <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{listing.description}</p>

        <div className="flex flex-col gap-2 pt-2">
          {ownerPhone && (
            <a href={`https://wa.me/${ownerPhone}?text=${encodeURIComponent(waMessage)}`} target="_blank" rel="noopener noreferrer"
              className="w-full rounded-full bg-success text-success-foreground font-semibold py-2.5 flex items-center justify-center gap-2">
              <MessageCircle className="h-4 w-4" /> Contacter l'agent
            </a>
          )}
          {zwandakoHref && (
            <a href={zwandakoHref} target="_blank" rel="noopener noreferrer"
              className="w-full rounded-full bg-primary text-primary-foreground font-semibold py-2.5 flex items-center justify-center gap-2">
              <ExternalLink className="h-4 w-4" /> Voir sur Zwandako
            </a>
          )}
          {group && (
            <Link to={`/group/${group.id}#listing-${listing.id}`}
              className="w-full rounded-full bg-muted text-foreground font-semibold py-2.5 flex items-center justify-center gap-2">
              Ouvrir dans le groupe
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
