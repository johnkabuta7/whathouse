import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Trash2, Search, Share2, Download, MapPin, Briefcase, Heart, Users, MessageSquare, Copy, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useMyListings, useMyFavorites, useMyGroups, useProfile } from '@/hooks/use-data';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { toPng } from 'html-to-image';

type Tab = 'tableau' | 'demandes' | 'matches' | 'carte';

type SearchRequest = {
  id: string;
  clientName: string;
  clientPhone: string;
  description: string;
  createdAt: number;
  active?: boolean;
};

const STORAGE_KEY = 'wh_search_requests';

function loadRequests(): SearchRequest[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveRequests(rs: SearchRequest[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rs));
}

function tokenize(text: string): string[] {
  return (text || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .filter(w => w.length >= 3);
}

function scoreMatch(hay: string, needles: string[]): number {
  const h = (hay || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
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
  const [tab, setTab] = useState<Tab>('tableau');
  const [requests, setRequests] = useState<SearchRequest[]>([]);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [description, setDescription] = useState('');
  const [matches, setMatches] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeReqId, setActiveReqId] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardTitle, setCardTitle] = useState('Agent immobilier');

  useEffect(() => { setRequests(loadRequests()); }, []);

  const addRequest = () => {
    if (!description.trim()) return;
    const next: SearchRequest[] = [
      { id: crypto.randomUUID(), clientName: clientName.trim(), clientPhone: clientPhone.trim(), description: description.trim(), createdAt: Date.now(), active: false },
      ...requests,
    ];
    setRequests(next); saveRequests(next);
    setClientName(''); setClientPhone(''); setDescription('');
    toast({ title: 'Demande enregistrée' });
  };
  const removeRequest = (id: string) => {
    const next = requests.filter(r => r.id !== id);
    setRequests(next); saveRequests(next);
    if (activeReqId === id) { setActiveReqId(null); setMatches([]); }
  };

  const activateAndSearch = async (req: SearchRequest) => {
    setActiveReqId(req.id);
    setTab('matches');
    await runMatchSearch(req);
  };

  const runMatchSearch = async (req: SearchRequest) => {
    setSearching(true);
    setMatches([]);
    try {
      const needles = tokenize(req.description);
      if (needles.length === 0) { setMatches([]); return; }

      // 1) Supabase listings from all accessible groups (RLS filters automatically)
      const { data: dbListings } = await supabase
        .from('listings')
        .select('id, title, description, images, created_at, group_id, zwandako_url, user_id')
        .order('created_at', { ascending: false })
        .limit(300);

      const dbMatches = (dbListings || [])
        .map(l => ({ ...l, source: 'whathouse', _score: scoreMatch(`${l.title} ${l.description || ''}`, needles) }))
        .filter(l => l._score > 0);

      // 2) Zwandako posts via wp-proxy
      let wpMatches: any[] = [];
      try {
        const { data: wp } = await supabase.functions.invoke('wp-proxy', {
          body: { action: 'list_posts', per_page: 50, page: 1 },
        });
        const posts = (wp?.posts || []) as any[];
        wpMatches = posts
          .map(p => {
            const title = p.title?.rendered || '';
            const excerpt = (p.excerpt?.rendered || p.content?.rendered || '').replace(/<[^>]*>/g, '');
            const img = p._embedded?.['wp:featuredmedia']?.[0]?.source_url;
            return { id: `wp_${p.id}`, title, description: excerpt, images: img ? [img] : [], created_at: p.date, zwandako_url: p.link, source: 'zwandako', _score: scoreMatch(`${title} ${excerpt}`, needles) };
          })
          .filter(p => p._score > 0);
      } catch (e) {
        // Silent — Zwandako optional
      }

      const all = [...dbMatches, ...wpMatches].sort((a, b) => b._score - a._score).slice(0, 40);
      setMatches(all);
      if (all.length === 0) toast({ title: 'Aucun match trouvé', description: 'Ajustez la description du bien recherché.' });
    } catch (e: any) {
      toast({ title: 'Erreur de recherche', description: e?.message || '', variant: 'destructive' });
    } finally {
      setSearching(false);
    }
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
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true });
      const a = document.createElement('a');
      a.download = `carte-${fullName.replace(/\s+/g, '-')}.png`;
      a.href = dataUrl;
      a.click();
    } catch (e: any) {
      toast({ title: 'Erreur', description: 'Impossible de générer l\'image', variant: 'destructive' });
    }
  };
  const shareCard = async () => {
    if (!cardRef.current) return;
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `carte-${fullName}.png`, { type: 'image/png' });
      const shareText = `Découvrez mes annonces immobilières sur Zwandako : ${zwandakoUrl}`;
      if ((navigator as any).canShare && (navigator as any).canShare({ files: [file] })) {
        await (navigator as any).share({ files: [file], title: fullName, text: shareText });
      } else if (navigator.share) {
        await navigator.share({ title: fullName, text: shareText, url: zwandakoUrl });
      } else {
        await navigator.clipboard.writeText(`${shareText}`);
        toast({ title: 'Lien copié', description: 'Partage manuel disponible.' });
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

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32" data-no-swipe>
        {tab === 'tableau' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={<MessageSquare className="h-5 w-5" />} value={myListings?.length || 0} label="Mes annonces" />
              <StatCard icon={<Users className="h-5 w-5" />} value={myGroups?.length || 0} label="Groupes" />
              <StatCard icon={<Heart className="h-5 w-5" />} value={totalLikes} label="Likes reçus" />
              <StatCard icon={<Briefcase className="h-5 w-5" />} value={requests.length} label="Demandes actives" />
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-2">Activité récente</h3>
              <div className="rounded-2xl p-4 bg-primary/10 space-y-2">
                {(myListings || []).slice(0, 3).map((l: any) => (
                  <div key={l.id} className="flex items-center gap-3 text-sm">
                    {l.images?.[0] ? <img src={l.images[0]} className="h-10 w-10 rounded-lg object-cover" /> : <div className="h-10 w-10 rounded-lg bg-muted" />}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{l.title}</p>
                      <p className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleDateString('fr-FR')}</p>
                    </div>
                  </div>
                ))}
                {(!myListings || myListings.length === 0) && (
                  <p className="text-sm text-foreground">Aucune activité pour le moment.</p>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-2">Mon portefeuille ({myFavs?.length || 0})</h3>
              <div className="rounded-2xl p-4 bg-primary/10 text-sm text-foreground">
                {myFavs && myFavs.length > 0 ? (
                  <ul className="space-y-2">
                    {myFavs.slice(0, 4).map((l: any) => (
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
            </div>
          </>
        )}

        {tab === 'demandes' && (
          <>
            <div className="rounded-2xl p-4 space-y-3 bg-primary/5 border border-primary/20">
              <div>
                <h3 className="font-semibold text-foreground">Avis de recherche</h3>
                <p className="text-xs text-muted-foreground mt-1">Décrivez le bien recherché : lieu, budget, type, caractéristiques.</p>
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
                {requests.map(r => (
                  <li key={r.id} className="rounded-2xl border border-border bg-card p-3 space-y-2">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        {r.clientName && <p className="text-sm font-semibold text-foreground">{r.clientName}</p>}
                        {r.clientPhone && <p className="text-xs text-muted-foreground">{r.clientPhone}</p>}
                        <p className="text-sm text-foreground mt-1 break-words">{r.description}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">{new Date(r.createdAt).toLocaleString('fr-FR')}</p>
                      </div>
                      <button onClick={() => removeRequest(r.id)} className="p-1.5 rounded-full hover:bg-destructive/10 text-destructive shrink-0">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <button onClick={() => activateAndSearch(r)} className="w-full flex items-center justify-center gap-2 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold">
                      <Search className="h-4 w-4" /> Lancer la recherche
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {tab === 'matches' && (
          <>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Résultats WhatHouse + Zwandako</h3>
              {activeReqId && (
                <button onClick={() => { const r = requests.find(x => x.id === activeReqId); if (r) runMatchSearch(r); }} className="text-xs text-primary font-semibold flex items-center gap-1">
                  <Search className="h-3 w-3" /> Actualiser
                </button>
              )}
            </div>
            {!activeReqId ? (
              <div className="rounded-2xl p-4 bg-primary/10 text-sm text-foreground">
                Activez une demande depuis l'onglet Demandes pour lancer la recherche automatique.
              </div>
            ) : searching ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Recherche en cours…
              </div>
            ) : matches.length === 0 ? (
              <div className="rounded-2xl p-4 bg-primary/10 text-sm text-foreground">Aucun match trouvé pour cette demande.</div>
            ) : (
              <ul className="space-y-2">
                {matches.map((m: any) => (
                  <li key={`${m.source}_${m.id}`} className="rounded-2xl border border-border bg-card p-3 flex items-start gap-3">
                    {m.images?.[0] ? <img src={m.images[0]} className="h-16 w-16 rounded-lg object-cover shrink-0" /> : <div className="h-16 w-16 rounded-lg bg-muted shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${m.source === 'zwandako' ? 'bg-orange-500/15 text-orange-600' : 'bg-primary/15 text-primary'}`}>{m.source === 'zwandako' ? 'Zwandako' : 'WhatHouse'}</span>
                        <span className="text-[10px] text-muted-foreground">Score {m._score}</span>
                      </div>
                      <p className="text-sm font-semibold text-foreground mt-1 line-clamp-1">{m.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{m.description}</p>
                      {m.source === 'zwandako' ? (
                        <a href={m.zwandako_url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-primary font-semibold">
                          Voir sur Zwandako <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : m.group_id ? (
                        <button onClick={() => navigate(`/group/${m.group_id}`)} className="mt-1 text-xs text-primary font-semibold">Voir dans le groupe</button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {tab === 'carte' && (
          <>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Fonction affichée</label>
              <input value={cardTitle} onChange={e => setCardTitle(e.target.value)} className="w-full mt-1 px-4 py-2.5 rounded-xl border border-border bg-background text-sm" />
            </div>

            <div className="flex justify-center py-2">
              <div ref={cardRef} className="w-[340px] rounded-3xl p-3" style={{ background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.7) 100%)' }}>
                <div className="bg-white rounded-2xl border-[3px] border-orange-500 p-4">
                  <p className="text-center font-bold text-black text-lg mb-3">Immobilier de Lux</p>
                  <div className="flex items-start gap-3">
                    <div className="h-16 w-16 rounded-full overflow-hidden bg-orange-100 flex items-center justify-center shrink-0">
                      {avatarUrl ? <img src={avatarUrl} className="h-full w-full object-cover" /> : <span className="text-2xl font-bold text-orange-600">{(fullName[0] || 'U').toUpperCase()}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-black text-base leading-tight">{fullName}</p>
                      <p className="text-sm text-gray-600 mt-0.5">{cardTitle}</p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1 text-sm text-black">
                    {email && <p className="truncate">{email}</p>}
                    {phone && <p>{phone}</p>}
                  </div>
                  <p className="mt-3 pt-3 border-t border-orange-200 text-[11px] text-orange-600 font-semibold break-all">{zwandakoUrl}</p>
                </div>
                <p className="text-center text-white text-[11px] mt-2 font-medium">Toutes mes annonces sur Zwandako</p>
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
