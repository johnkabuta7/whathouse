import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Plus, Trash2, Play, Pause, Share2, Download, Briefcase, Heart, Users, MessageSquare, Copy, ExternalLink, ChevronDown, ChevronUp, Send, Phone, Mail, Globe, MapPin, X, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMyListings, useMyFavorites, useMyGroups, useProfile } from '@/hooks/use-data';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { toPng } from 'html-to-image';
import { useMyTakeNotifications, useRealtimeTakeNotifications, recordListingTake } from '@/hooks/use-takes';

type Tab = 'tableau' | 'demandes' | 'matches' | 'carte';

type SearchRequest = {
  id: string;
  clientName: string;
  clientPhone: string;
  description: string;
  createdAt: number;
  active?: boolean;
};

type TakenListing = {
  id: string;
  title: string;
  description: string;
  image: string | null;
  group_id?: string | null;
  takenAt: number;
  source: 'whathouse' | 'zwandako';
  zwandako_url?: string | null;
};

type MatchItem = {
  key: string;
  requestId: string;
  source: 'whathouse' | 'zwandako';
  id: string;
  title: string;
  description: string;
  images: string[];
  created_at: string;
  group_id?: string | null;
  zwandako_url?: string | null;
  user_id?: string | null;
  _score: number;
};

const STORAGE_KEY = 'wh_search_requests';
const TAKEN_KEY = 'wh_taken_listings';

function loadRequests(): SearchRequest[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveRequests(rs: SearchRequest[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rs));
}
function loadTaken(): TakenListing[] {
  try { return JSON.parse(localStorage.getItem(TAKEN_KEY) || '[]'); } catch { return []; }
}
function saveTaken(t: TakenListing[]) {
  localStorage.setItem(TAKEN_KEY, JSON.stringify(t));
}

function normalize(s: string): string {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
function tokenize(text: string): string[] {
  return normalize(text).split(/[^a-z0-9]+/).filter(w => w.length >= 3);
}
function scoreMatch(hay: string, needles: string[]): number {
  const h = normalize(hay);
  let s = 0;
  for (const n of needles) if (h.includes(n)) s++;
  return s;
}

export default function Affaires() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: myListings } = useMyListings();
  const { data: myFavs } = useMyFavorites();
  const { data: myGroups } = useMyGroups();
  const { data: profile } = useProfile(user?.id || '');
  const { data: takeNotifs } = useMyTakeNotifications();
  useRealtimeTakeNotifications();
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as Tab) || 'tableau';
  const initialSub = (searchParams.get('sub') as any) || 'stats';
  const [tab, setTab] = useState<Tab>(initialTab);
  const [requests, setRequests] = useState<SearchRequest[]>([]);
  const [taken, setTaken] = useState<TakenListing[]>([]);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [description, setDescription] = useState('');
  const [matches, setMatches] = useState<MatchItem[]>([]);
  type SubTab = 'stats' | 'notifs' | 'ongoing' | 'portfolio';
  const [subTab, setSubTab] = useState<SubTab>(['stats','notifs','ongoing','portfolio'].includes(initialSub) ? initialSub : 'stats');
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardTitle, setCardTitle] = useState('Agent immobilier');
  const [cardAgency, setCardAgency] = useState('Immobilier de Luxe');

  useEffect(() => {
    setRequests(loadRequests());
    setTaken(loadTaken());
    const onStorage = () => setTaken(loadTaken());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Refresh taken list whenever the Tableau tab is opened
  useEffect(() => { if (tab === 'tableau') setTaken(loadTaken()); }, [tab]);

  const activeRequests = useMemo(() => requests.filter(r => r.active), [requests]);

  // Match search for a single request
  const searchForRequest = useCallback(async (req: SearchRequest): Promise<MatchItem[]> => {
    const needles = tokenize(req.description);
    if (needles.length === 0) return [];
    const out: MatchItem[] = [];
    try {
      const { data: dbListings } = await supabase
        .from('listings')
        .select('id, title, description, images, created_at, group_id, zwandako_url, user_id')
        .order('created_at', { ascending: false })
        .limit(300);
      for (const l of dbListings || []) {
        const score = scoreMatch(`${l.title} ${l.description || ''}`, needles);
        if (score >= Math.max(1, Math.ceil(needles.length * 0.4))) {
          out.push({
            key: `${req.id}:wh:${l.id}`, requestId: req.id, source: 'whathouse',
            id: l.id, title: l.title, description: l.description || '',
            images: l.images || [], created_at: l.created_at,
            group_id: l.group_id, zwandako_url: l.zwandako_url,
            user_id: (l as any).user_id, _score: score,
          });
        }
      }
    } catch { /* ignore */ }
    try {
      const { data: wp } = await supabase.functions.invoke('wp-proxy', {
        body: { action: 'list_posts', per_page: 50, page: 1 },
      });
      const posts = (wp?.posts || []) as any[];
      for (const p of posts) {
        const title = p.title?.rendered || '';
        const excerpt = (p.excerpt?.rendered || p.content?.rendered || '').replace(/<[^>]*>/g, '');
        const score = scoreMatch(`${title} ${excerpt}`, needles);
        if (score >= Math.max(1, Math.ceil(needles.length * 0.4))) {
          const img = p._embedded?.['wp:featuredmedia']?.[0]?.source_url;
          out.push({
            key: `${req.id}:zw:${p.id}`, requestId: req.id, source: 'zwandako',
            id: String(p.id), title, description: excerpt,
            images: img ? [img] : [], created_at: p.date,
            zwandako_url: p.link, _score: score,
          });
        }
      }
    } catch { /* ignore */ }
    return out;
  }, []);

  // Re-run search whenever active requests change or a listing is inserted
  const runAllActiveSearches = useCallback(async () => {
    if (activeRequests.length === 0) { setMatches([]); return; }
    const all: MatchItem[] = [];
    for (const r of activeRequests) {
      const found = await searchForRequest(r);
      all.push(...found);
    }
    // Dedupe by key, keep highest score
    const map = new Map<string, MatchItem>();
    for (const m of all) {
      const existing = map.get(m.key);
      if (!existing || existing._score < m._score) map.set(m.key, m);
    }
    setMatches(Array.from(map.values()).sort((a, b) => b._score - a._score));
  }, [activeRequests, searchForRequest]);

  useEffect(() => { runAllActiveSearches(); }, [runAllActiveSearches]);

  // Realtime: when a new listing is inserted, re-run active searches
  useEffect(() => {
    if (activeRequests.length === 0) return;
    const channel = supabase
      .channel('affaires-listings')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'listings' }, () => {
        runAllActiveSearches();
      })
      .subscribe();
    // Poll Zwandako every 60s
    const interval = setInterval(runAllActiveSearches, 60000);
    return () => { supabase.removeChannel(channel); clearInterval(interval); };
  }, [activeRequests.length, runAllActiveSearches]);

  const addRequest = () => {
    if (!description.trim()) return;
    const next: SearchRequest[] = [
      { id: crypto.randomUUID(), clientName: clientName.trim(), clientPhone: clientPhone.trim(), description: description.trim(), createdAt: Date.now(), active: true },
      ...requests,
    ];
    setRequests(next); saveRequests(next);
    setClientName(''); setClientPhone(''); setDescription('');
    toast({ title: 'Demande enregistrée', description: 'Recherche activée automatiquement.' });
  };
  const removeRequest = (id: string) => {
    const next = requests.filter(r => r.id !== id);
    setRequests(next); saveRequests(next);
    setMatches(m => m.filter(x => x.requestId !== id));
  };
  const toggleActive = (id: string) => {
    const next = requests.map(r => r.id === id ? { ...r, active: !r.active } : r);
    setRequests(next); saveRequests(next);
    if (!next.find(r => r.id === id)?.active) {
      setMatches(m => m.filter(x => x.requestId !== id));
    }
  };

  const takeMatch = (m: MatchItem) => {
    const arr = loadTaken();
    if (arr.find(x => x.id === m.id)) {
      toast({ title: 'Déjà pris' });
      return;
    }
    const entry: TakenListing = {
      id: m.id, title: m.title, description: m.description,
      image: m.images[0] || null, group_id: m.group_id || null,
      takenAt: Date.now(), source: m.source, zwandako_url: m.zwandako_url || null,
    };
    const next = [entry, ...arr];
    saveTaken(next); setTaken(next);
    if (m.source === 'whathouse' && m.user_id && user) {
      recordListingTake({ listingId: m.id, ownerId: m.user_id, takerId: user.id, title: m.title, image: m.images[0] || null });
    }
    toast({ title: 'Annonce prise', description: 'Ajoutée à Affaire en cours.' });
  };
  const untake = (id: string) => {
    const next = taken.filter(t => t.id !== id);
    saveTaken(next); setTaken(next);
  };

  const fullName = `${profile?.first_name || user?.profile?.first_name || ''} ${profile?.last_name || user?.profile?.last_name || ''}`.trim() || 'Utilisateur';
  const phone = profile?.phone || user?.profile?.phone || '';
  const email = (profile as any)?.email || user?.email || '';
  const avatarUrl = profile?.avatar_url || user?.profile?.avatar_url;
  const wpUserId = (profile as any)?.wp_user_id;
  const zwandakoUrl = wpUserId ? `https://zwandako.com/?author=${wpUserId}` : 'https://zwandako.com';

  const downloadCard = async () => {
    if (!cardRef.current) return;
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 3, cacheBust: true });
      const a = document.createElement('a');
      a.download = `carte-${fullName.replace(/\s+/g, '-')}.png`;
      a.href = dataUrl; a.click();
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de générer l\'image', variant: 'destructive' });
    }
  };
  const shareCard = async () => {
    if (!cardRef.current) return;
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 3, cacheBust: true });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `carte-${fullName}.png`, { type: 'image/png' });
      const shareText = `Mes annonces immobilières sur Zwandako : ${zwandakoUrl}`;
      if ((navigator as any).canShare?.({ files: [file] })) {
        await (navigator as any).share({ files: [file], title: fullName, text: shareText });
      } else if (navigator.share) {
        await navigator.share({ title: fullName, text: shareText, url: zwandakoUrl });
      } else {
        await navigator.clipboard.writeText(shareText);
        toast({ title: 'Lien copié' });
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') toast({ title: 'Partage annulé', variant: 'destructive' });
    }
  };
  const copyLink = async () => {
    await navigator.clipboard.writeText(zwandakoUrl);
    toast({ title: 'Lien copié !' });
  };

  if (!user) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-background p-6 text-center gap-4">
        <h2 className="text-xl font-semibold">Connexion requise</h2>
        <p className="text-sm text-muted-foreground max-w-sm">Connectez-vous pour accéder à vos affaires.</p>
        <Button onClick={() => navigate('/profil')}>Se connecter</Button>
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'tableau', label: 'Tableau' },
    { key: 'demandes', label: 'Demandes' },
    { key: 'matches', label: 'Matches' },
    { key: 'carte', label: 'Carte' },
  ];

  const totalLikes = (myListings || []).reduce((s, l: any) => s + (l.like_count || 0), 0);

  return (
    <div className="h-full w-full flex flex-col bg-background">
      <header className="shrink-0 px-4 pt-6 pb-2" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 5mm)' }}>
        <h1 className="text-2xl font-bold text-foreground">Affaires</h1>
        <p className="text-xs text-muted-foreground">Votre bureau d'agent immobilier</p>
      </header>

      <div className="shrink-0 flex items-center border-b border-border">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-3 text-sm font-semibold transition-colors relative ${tab === t.key ? 'text-primary' : 'text-primary/60'}`}
          >
            {t.label}
            {tab === t.key && <span className="absolute bottom-0 left-2 right-2 h-[3px] bg-primary rounded-full" />}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-32" data-no-swipe>
        {tab === 'tableau' && (
          <>
            {/* Sub-tabs — même style que « Mes annonces » (soulignés) */}
            <div className="flex mb-3 relative overflow-x-auto no-scrollbar">
              {([
                { key: 'stats', label: 'Statistiques' },
                { key: 'notifs', label: 'Notifications' },
                { key: 'recent', label: 'Activité' },
                { key: 'ongoing', label: 'En cours' },
                { key: 'portfolio', label: 'Portefeuille' },
              ] as { key: SubTab; label: string }[]).map(s => (
                <button
                  key={s.key}
                  onClick={() => setSubTab(s.key)}
                  className={`flex-1 min-w-[80px] py-2 text-xs font-semibold text-center transition relative ${subTab === s.key ? 'text-primary' : 'text-muted-foreground'}`}
                >
                  {s.label}
                  {subTab === s.key && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-1/4 bg-primary rounded-full" />}
                </button>
              ))}
            </div>

            {subTab === 'stats' && (
              <div className="grid grid-cols-2 gap-3">
                <StatCard icon={<MessageSquare className="h-5 w-5" />} value={myListings?.length || 0} label="Mes annonces" />
                <StatCard icon={<Users className="h-5 w-5" />} value={myGroups?.length || 0} label="Groupes" />
                <StatCard icon={<Heart className="h-5 w-5" />} value={totalLikes} label="Likes reçus" />
                <StatCard icon={<Briefcase className="h-5 w-5" />} value={activeRequests.length} label="Recherches actives" />
              </div>
            )}

            {subTab === 'notifs' && (
              (!takeNotifs || takeNotifs.length === 0) ? (
                <div className="rounded-2xl p-4 bg-primary/10 text-sm text-foreground">
                  Aucune notification. Lorsqu'un agent prend une de vos annonces, vous serez averti ici avec ses coordonnées.
                </div>
              ) : (
                <ul className="space-y-2">
                  {takeNotifs.map(n => {
                    const takerName = `${n.taker?.first_name || ''} ${n.taker?.last_name || ''}`.trim() || 'Agent';
                    const initials = takerName.split(' ').map(s => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'A';
                    const phone = (n.taker?.phone || '').replace(/[^0-9]/g, '');
                    const waMsg = `Bonjour ${takerName}, merci d'avoir pris en charge mon annonce « ${n.listing_title || ''} ». Comment puis-je vous aider ?`;
                    return (
                      <li key={n.id} className="rounded-2xl border border-border bg-card p-3">
                        <div className="flex items-start gap-3">
                          <div className="h-11 w-11 rounded-full bg-primary/10 overflow-hidden flex items-center justify-center shrink-0 ring-2 ring-primary/20">
                            {n.taker?.avatar_url ? (
                              <img src={n.taker.avatar_url} alt={takerName} className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-xs font-bold text-primary">{initials}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{takerName}</p>
                            <p className="text-xs text-muted-foreground truncate">a pris « {n.listing_title || 'votre annonce'} »</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(n.created_at).toLocaleString('fr-FR')}</p>
                          </div>
                          {n.listing_image && (
                            <img src={n.listing_image} className="h-11 w-11 rounded-lg object-cover shrink-0" alt="" />
                          )}
                        </div>
                        {phone ? (
                          <a
                            href={`https://wa.me/${phone}?text=${encodeURIComponent(waMsg)}`}
                            target="_blank" rel="noopener noreferrer"
                            className="mt-3 w-full inline-flex items-center justify-center gap-2 py-2 rounded-full bg-success text-success-foreground text-xs font-semibold"
                          >
                            <MessageSquare className="h-3.5 w-3.5" /> Contacter sur WhatsApp
                          </a>
                        ) : (
                          <p className="mt-3 text-[11px] text-muted-foreground text-center">Numéro WhatsApp indisponible</p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )
            )}

            {subTab === 'recent' && (
              <div className="rounded-2xl p-3 bg-primary/10 space-y-2">
                {(myListings || []).slice(0, 5).map((l: any) => (
                  <button key={l.id} onClick={() => navigate(`/listing/${l.id}`)} className="w-full flex items-center gap-3 text-sm text-left">
                    {l.images?.[0] ? <img src={l.images[0]} className="h-10 w-10 rounded-lg object-cover" /> : <div className="h-10 w-10 rounded-lg bg-muted" />}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{l.title}</p>
                      <p className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleDateString('fr-FR')}</p>
                    </div>
                  </button>
                ))}
                {(!myListings || myListings.length === 0) && <p className="text-sm text-foreground">Aucune activité.</p>}
              </div>
            )}

            {subTab === 'ongoing' && (
              taken.length === 0 ? (
                <div className="rounded-2xl p-4 bg-primary/10 text-sm text-foreground">
                  Aucune annonce prise. Utilisez « Prendre » sur une annonce ou un match pour l'ajouter ici.
                </div>
              ) : (
                <ul className="space-y-2">
                  {taken.map(t => (
                    <li key={t.id} className="rounded-2xl border border-border bg-card p-3 flex items-start gap-3">
                      {t.image ? <img src={t.image} className="h-14 w-14 rounded-lg object-cover shrink-0" /> : <div className="h-14 w-14 rounded-lg bg-muted shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground line-clamp-1">{t.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          {t.source === 'zwandako' && t.zwandako_url ? (
                            <a href={t.zwandako_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary font-semibold inline-flex items-center gap-1">
                              Zwandako <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : t.group_id ? (
                            <button onClick={() => navigate(`/group/${t.group_id}`)} className="text-xs text-primary font-semibold">Voir dans le groupe</button>
                          ) : null}
                          <span className="text-[10px] text-muted-foreground ml-auto">{new Date(t.takenAt).toLocaleDateString('fr-FR')}</span>
                        </div>
                      </div>
                      <button onClick={() => untake(t.id)} className="p-1.5 rounded-full hover:bg-destructive/10 text-destructive shrink-0" aria-label="Retirer">
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )
            )}

            {subTab === 'portfolio' && (
              <div className="rounded-2xl p-3 bg-primary/10 text-sm text-foreground">
                {myFavs && myFavs.length > 0 ? (
                  <ul className="space-y-2">
                    {myFavs.slice(0, 6).map((l: any) => (
                      <li key={l.id} className="flex items-center gap-3">
                        {l.images?.[0] ? <img src={l.images[0]} className="h-10 w-10 rounded-lg object-cover" /> : <div className="h-10 w-10 rounded-lg bg-background" />}
                        <span className="truncate">{l.title}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span>Touchez ♡ sur une annonce pour l'ajouter à votre portefeuille.</span>
                )}
              </div>
            )}
          </>
        )}


        {tab === 'demandes' && (
          <>
            <div className="rounded-2xl p-4 space-y-3 bg-primary/5 border border-primary/20">
              <div>
                <h3 className="font-semibold text-foreground">Avis de recherche</h3>
                <p className="text-xs text-muted-foreground mt-1">Chaque demande lance sa propre recherche automatique (WhatHouse + Zwandako, en temps réel).</p>
              </div>
              <input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Nom du client" className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm" />
              <input value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="Téléphone du client" className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm" />
              <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex. Villa 4 chambres à Gombe, budget 150000 $…" rows={4} className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm resize-none" />
              <button onClick={addRequest} disabled={!description.trim()} className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50">
                <Plus className="h-4 w-4" /> Enregistrer la demande
              </button>
            </div>

            {requests.length === 0 ? (
              <div className="rounded-2xl p-4 bg-primary/10 text-sm text-foreground">Aucune demande enregistrée.</div>
            ) : (
              <ul className="space-y-2">
                {requests.map(r => {
                  const requestMatches = matches.filter(m => m.requestId === r.id).length;
                  return (
                    <li key={r.id} className={`rounded-2xl border p-3 space-y-2 ${r.active ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}>
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          {r.clientName && <p className="text-sm font-semibold text-foreground">{r.clientName}</p>}
                          {r.clientPhone && (
                            <a href={`tel:${r.clientPhone}`} className="text-xs text-primary inline-flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {r.clientPhone}
                            </a>
                          )}
                          <p className="text-sm text-foreground mt-1 break-words">{r.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-muted-foreground">{new Date(r.createdAt).toLocaleString('fr-FR')}</span>
                            {r.active && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary">
                                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                                Actif · {requestMatches} match{requestMatches > 1 ? 'es' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          <button
                            onClick={() => toggleActive(r.id)}
                            className={`p-2 rounded-full ${r.active ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'}`}
                            aria-label={r.active ? 'Mettre en pause' : 'Démarrer la recherche'}
                            title={r.active ? 'Mettre en pause' : 'Démarrer la recherche'}
                          >
                            {r.active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </button>
                          <button onClick={() => removeRequest(r.id)} className="p-2 rounded-full hover:bg-destructive/10 text-destructive" aria-label="Supprimer">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}

        {tab === 'matches' && (
          <>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Matches en temps réel</h3>
              <span className="text-xs text-muted-foreground">{activeRequests.length} recherche{activeRequests.length > 1 ? 's' : ''} active{activeRequests.length > 1 ? 's' : ''}</span>
            </div>
            {activeRequests.length === 0 ? (
              <div className="rounded-2xl p-4 bg-primary/10 text-sm text-foreground">
                Activez au moins une demande (bouton ▶) pour voir les correspondances s'afficher automatiquement dès qu'une annonce est publiée.
              </div>
            ) : matches.length === 0 ? (
              <div className="rounded-2xl p-4 bg-primary/10 text-sm text-foreground">Aucune correspondance pour l'instant. Vous serez notifié dès qu'une annonce correspondante sera publiée.</div>
            ) : (
              <ul className="space-y-2">
                {matches.map(m => {
                  const req = requests.find(r => r.id === m.requestId);
                  return (
                    <li key={m.key} className="rounded-2xl border border-border bg-card p-3">
                      <div className="flex items-start gap-3">
                        {m.images[0] ? <img src={m.images[0]} className="h-16 w-16 rounded-lg object-cover shrink-0" /> : <div className="h-16 w-16 rounded-lg bg-muted shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${m.source === 'zwandako' ? 'bg-orange-500/15 text-orange-600' : 'bg-primary/15 text-primary'}`}>
                              {m.source === 'zwandako' ? 'Zwandako' : 'WhatHouse'}
                            </span>
                            <span className="text-[10px] text-muted-foreground">Match {m._score}</span>
                            {req?.clientName && <span className="text-[10px] text-muted-foreground truncate">pour {req.clientName}</span>}
                          </div>
                          <p className="text-sm font-semibold text-foreground mt-1 line-clamp-1">{m.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2">{m.description}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        {m.source === 'zwandako' ? (
                          <a href={m.zwandako_url || '#'} target="_blank" rel="noopener noreferrer" className="py-2 rounded-full border border-border text-primary text-xs font-semibold text-center inline-flex items-center justify-center gap-1">
                            Voir <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : m.group_id ? (
                          <button onClick={() => navigate(`/group/${m.group_id}`)} className="py-2 rounded-full border border-border text-primary text-xs font-semibold">Voir</button>
                        ) : (
                          <button onClick={() => navigate(`/listing/${m.id}`)} className="py-2 rounded-full border border-border text-primary text-xs font-semibold">Voir</button>
                        )}
                        <button onClick={() => takeMatch(m)} className="py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold inline-flex items-center justify-center gap-1">
                          <Send className="h-3 w-3" /> Prendre
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}

        {tab === 'carte' && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Fonction</label>
                <input value={cardTitle} onChange={e => setCardTitle(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-xl border border-border bg-background text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Agence</label>
                <input value={cardAgency} onChange={e => setCardAgency(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-xl border border-border bg-background text-sm" />
              </div>
            </div>

            <div className="flex justify-center py-3">
              <div ref={cardRef} className="w-[340px] rounded-3xl overflow-hidden shadow-2xl" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, hsl(var(--primary)) 130%)' }}>
                {/* Top: agency + logo strip */}
                <div className="px-5 pt-5 pb-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/60 font-semibold">Carte de visite</p>
                    <p className="text-white font-bold text-base leading-tight mt-0.5">{cardAgency}</p>
                  </div>
                  <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ background: 'hsl(var(--primary))' }}>
                    <Briefcase className="h-5 w-5 text-white" />
                  </div>
                </div>

                <div className="mx-4 rounded-2xl bg-white p-4 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-16 w-16 rounded-full overflow-hidden ring-4 flex items-center justify-center shrink-0" style={{ background: 'hsl(var(--primary) / 0.15)', boxShadow: '0 0 0 4px hsl(var(--primary))' } as any}>
                      {avatarUrl ? <img src={avatarUrl} className="h-full w-full object-cover" /> : <span className="text-xl font-bold" style={{ color: 'hsl(var(--primary))' }}>{(fullName[0] || 'U').toUpperCase()}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 text-base leading-tight truncate">{fullName}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{cardTitle}</p>
                      <div className="h-0.5 w-10 rounded-full mt-1.5" style={{ background: 'hsl(var(--primary))' }} />
                    </div>
                  </div>
                  <div className="mt-3 space-y-1.5 text-[13px] text-slate-700">
                    {phone && (
                      <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" style={{ color: 'hsl(var(--primary))' }} /><span>{phone}</span></div>
                    )}
                    {email && (
                      <div className="flex items-center gap-2 min-w-0"><Mail className="h-3.5 w-3.5 shrink-0" style={{ color: 'hsl(var(--primary))' }} /><span className="truncate">{email}</span></div>
                    )}
                    <div className="flex items-center gap-2 min-w-0"><Globe className="h-3.5 w-3.5 shrink-0" style={{ color: 'hsl(var(--primary))' }} /><span className="truncate text-[11px] break-all">{zwandakoUrl.replace(/^https?:\/\//, '')}</span></div>
                  </div>
                </div>

                <div className="px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-white/80 text-[10px]">
                    <MapPin className="h-3 w-3" /> <span>Toutes mes annonces</span>
                  </div>
                  <span className="text-white font-bold text-[11px] tracking-wider">ZWANDAKO</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button onClick={shareCard} className="flex flex-col items-center gap-1 py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-xs">
                <Share2 className="h-4 w-4" /> Partager
              </button>
              <button onClick={downloadCard} className="flex flex-col items-center gap-1 py-3 rounded-2xl border border-border text-foreground font-semibold text-xs">
                <Download className="h-4 w-4" /> Télécharger
              </button>
              <button onClick={copyLink} className="flex flex-col items-center gap-1 py-3 rounded-2xl border border-border text-foreground font-semibold text-xs">
                <Copy className="h-4 w-4" /> Copier lien
              </button>
            </div>
            <p className="text-xs text-muted-foreground text-center">La carte partagée renvoie vers votre page Zwandako.</p>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="rounded-2xl p-4 bg-primary/10">
      <div className="flex items-center gap-2 text-primary">{icon}<span className="text-3xl font-bold">{value}</span></div>
      <p className="text-sm mt-1 text-foreground/80">{label}</p>
    </div>
  );
}

function Accordion({
  id, title, icon, summary, children, openId, setOpenId,
}: {
  id: string; title: string; icon?: React.ReactNode; summary?: string;
  children: React.ReactNode; openId: string | null; setOpenId: (v: string | null) => void;
}) {
  const open = openId === id;
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <button onClick={() => setOpenId(open ? null : id)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
        {icon && <span className="text-primary shrink-0">{icon}</span>}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground">{title}</p>
          {summary && <p className="text-xs text-muted-foreground truncate">{summary}</p>}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}
