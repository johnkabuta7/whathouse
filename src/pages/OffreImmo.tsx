import { useEffect, useMemo, useState, useCallback } from 'react';
import { Building2, Search, RefreshCw, Phone, LogIn, ChevronDown, ExternalLink, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

type SubTab = 'all' | 'mine';
type TxType = 'acheter' | 'louer' | 'vendre';

const TX_FILTERS: { key: TxType; label: string }[] = [
  { key: 'acheter', label: 'Acheter' },
  { key: 'louer', label: 'Louer' },
  { key: 'vendre', label: 'Vendre' },
];

type Request = {
  id: string;
  type: TxType;
  city: string;
  status: 'Disponible' | 'Réservé';
  date: string;
  title: string;
  price: string;
  description: string;
  phone: string;
  zwandakoUrl: string;
  mine?: boolean;
};

const DEMO_REQUESTS: Request[] = [
  { id: '1', type: 'louer', city: 'Kinshasa', status: 'Disponible', date: "Aujourd'hui", title: 'Appartement meublé · Gombe', price: '1 000 - 1 500 $', description: 'Client cherche un appartement 2 chambres, sécurisé, proche boulevard du 30 Juin.', phone: '+243900000000', zwandakoUrl: 'https://zwandako.com/demandes-immobilieres/' },
  { id: '2', type: 'acheter', city: 'Kinshasa', status: 'Disponible', date: 'Hier', title: 'Maison · Limete', price: '120 000 $ max', description: 'Recherche maison avec cour, minimum 3 chambres.', phone: '+243900000001', zwandakoUrl: 'https://zwandako.com/demandes-immobilieres/' },
  { id: '3', type: 'vendre', city: 'Lubumbashi', status: 'Disponible', date: 'Il y a 2 j', title: 'Villa à vendre · Golf', price: '250 000 $', description: 'Villa 5 chambres, piscine, terrain 1000 m².', phone: '+243900000002', zwandakoUrl: 'https://zwandako.com/demandes-immobilieres/' },
  { id: '4', type: 'louer', city: 'Goma', status: 'Disponible', date: 'Il y a 3 j', title: 'Studio meublé · Himbi', price: '500 $', description: 'Studio pour expat, court/long séjour.', phone: '+243900000003', zwandakoUrl: 'https://zwandako.com/demandes-immobilieres/' },
  { id: '5', type: 'acheter', city: 'Kinshasa', status: 'Disponible', date: 'Il y a 4 j', title: 'Parcelle · Ngaliema', price: '80 000 $', description: 'Parcelle 500 m² avec titre foncier.', phone: '+243900000004', zwandakoUrl: 'https://zwandako.com/demandes-immobilieres/' },
];

function detectType(text: string): TxType {
  const t = text.toLowerCase();
  if (/(vend|à vendre|a vendre)/.test(t)) return 'vendre';
  if (/(lou|à louer|a louer|loyer|bail)/.test(t)) return 'louer';
  return 'acheter';
}
function detectCity(text: string): string {
  const cities = ['Kinshasa', 'Lubumbashi', 'Goma', 'Bukavu', 'Matadi', 'Kolwezi', 'Kisangani', 'Mbuji-Mayi', 'Bruxelles', 'Paris'];
  for (const c of cities) if (new RegExp(c, 'i').test(text)) return c;
  return '—';
}
function extractPhone(text: string): string {
  const m = text.match(/(\+?\d[\d\s().-]{7,})/);
  return m ? m[1].replace(/[^\d+]/g, '') : '';
}
function extractPrice(text: string): string {
  const m = text.match(/(\d[\d\s.,]{1,})\s?(\$|USD|EUR|€|FC|CDF)/i);
  return m ? m[0].trim() : '—';
}
function timeAgo(iso: string): string {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "À l'instant";
  if (h < 24) return `Il y a ${h}h`;
  const days = Math.floor(h / 24);
  if (days === 1) return 'Hier';
  if (days < 7) return `Il y a ${days} j`;
  return new Date(iso).toLocaleDateString('fr-FR');
}

export default function OffreImmo() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tab, setTab] = useState<SubTab>('all');
  const [activeTx, setActiveTx] = useState<TxType | null>(null);
  const [activeCity, setActiveCity] = useState<string | null>(null);
  const [cityOpen, setCityOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [wpRequests, setWpRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchZwandako = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('wp-proxy', {
        body: { action: 'list_demandes', per_page: 40 },
      });
      if (error) throw error;
      const posts = (data?.posts || []) as any[];
      const mapped: Request[] = posts.map(p => {
        const title = (p.title?.rendered || '').replace(/<[^>]*>/g, '');
        const desc = (p.excerpt?.rendered || p.content?.rendered || '').replace(/<[^>]*>/g, '').trim().slice(0, 300);
        const full = `${title} ${desc}`;
        return {
          id: `wp_${p.id}`,
          type: detectType(full),
          city: detectCity(full),
          status: 'Disponible',
          date: timeAgo(p.date),
          title: title || 'Demande immobilière',
          price: extractPrice(full),
          description: desc || title,
          phone: extractPhone(full),
          zwandakoUrl: p.link,
        };
      });
      setWpRequests(mapped);
    } catch (e: any) {
      // Fallback to demo silently on first load; show toast on manual refresh
      if (wpRequests.length > 0) toast({ title: 'Actualisation impossible', description: e?.message || '', variant: 'destructive' });
    } finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchZwandako();
    const iv = setInterval(fetchZwandako, 60000); // real-time-ish refresh every 60s
    return () => clearInterval(iv);
  }, [fetchZwandako]);

  const source = wpRequests.length > 0 ? wpRequests : DEMO_REQUESTS;

  const cities = useMemo(() => {
    const set = new Set<string>();
    source.forEach(r => r.city && r.city !== '—' && set.add(r.city));
    return Array.from(set).sort();
  }, [source]);

  const requests = useMemo(() => {
    let r = source;
    if (tab === 'mine') r = r.filter(x => x.mine);
    if (activeTx) r = r.filter(x => x.type === activeTx);
    if (activeCity) r = r.filter(x => x.city === activeCity);
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(x => x.title.toLowerCase().includes(q) || x.description.toLowerCase().includes(q) || x.city.toLowerCase().includes(q));
    }
    return r;
  }, [source, tab, activeTx, activeCity, search]);

  if (!user) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-background p-6 text-center gap-4">
        <h2 className="text-xl font-semibold">Connexion requise</h2>
        <p className="text-sm text-muted-foreground max-w-sm">Vous devez être connecté pour accéder aux demandes immobilières.</p>
        <Button onClick={() => navigate('/profil')} className="gap-2"><LogIn className="h-4 w-4" /> Se connecter</Button>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-background">
      <header className="shrink-0 px-4 pt-6 pb-3 flex items-start gap-3" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 5mm)' }}>
        <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Building2 className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-foreground leading-tight">Offre Immo</h1>
          <p className="text-xs text-muted-foreground">{loading ? 'Actualisation…' : `${source.length} demandes${wpRequests.length > 0 ? ' · Zwandako live' : ''}`}</p>
        </div>
        <button onClick={() => setSearchOpen(s => !s)} className="p-2 rounded-full hover:bg-muted transition" aria-label="Rechercher">
          <Search className="h-5 w-5 text-foreground" />
        </button>
        <button onClick={fetchZwandako} disabled={loading} className="p-2 rounded-full hover:bg-muted transition disabled:opacity-50" aria-label="Rafraîchir">
          {loading ? <Loader2 className="h-5 w-5 text-foreground animate-spin" /> : <RefreshCw className="h-5 w-5 text-foreground" />}
        </button>
      </header>

      {searchOpen && (
        <div className="px-4 pb-2" data-no-swipe>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher une demande…" autoFocus className="w-full px-4 py-2.5 rounded-full border border-border bg-background text-sm" />
        </div>
      )}

      <div className="shrink-0 flex items-center border-b border-border">
        {[
          { key: 'all', label: 'Toutes les demandes' },
          { key: 'mine', label: 'Mes demandes' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as SubTab)} className={`flex-1 py-3 text-sm font-semibold transition-colors relative ${tab === t.key ? 'text-primary' : 'text-primary/60'}`}>
            {t.label}
            {tab === t.key && <span className="absolute bottom-0 left-4 right-4 h-[3px] bg-primary rounded-full" />}
          </button>
        ))}
      </div>

      <div className="shrink-0 px-4 py-3 flex items-center gap-2" data-no-swipe>
        <div className="flex-1 flex gap-2 overflow-x-auto no-scrollbar">
          {TX_FILTERS.map(f => {
            const active = activeTx === f.key;
            return (
              <button key={f.key} onClick={() => setActiveTx(active ? null : f.key)} className={`shrink-0 px-4 py-1.5 rounded-full border text-sm font-medium transition ${active ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-foreground border-border'}`}>
                {f.label}
              </button>
            );
          })}
        </div>
        <div className="relative shrink-0">
          <button onClick={() => setCityOpen(o => !o)} className={`flex items-center gap-1 px-3 py-1.5 rounded-full border text-sm font-medium ${activeCity ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-foreground border-border'}`}>
            {activeCity || 'Ville'} <ChevronDown className="h-3.5 w-3.5" />
          </button>
          {cityOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setCityOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-50 min-w-[160px] bg-card border border-border rounded-xl shadow-lg overflow-hidden max-h-64 overflow-y-auto">
                <button onClick={() => { setActiveCity(null); setCityOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-muted">Toutes les villes</button>
                {cities.map(c => (
                  <button key={c} onClick={() => { setActiveCity(c); setCityOpen(false); }} className={`w-full text-left px-3 py-2 text-sm hover:bg-muted ${activeCity === c ? 'text-primary font-semibold' : 'text-foreground'}`}>{c}</button>
                ))}
                {cities.length === 0 && <p className="px-3 py-2 text-xs text-muted-foreground">Aucune ville</p>}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3" data-no-swipe>
        {requests.length === 0 ? (
          <div className="rounded-2xl p-6 bg-primary/10 text-sm text-foreground text-center">
            {tab === 'mine' ? 'Aucune demande prise pour le moment.' : 'Aucune demande trouvée pour ces filtres.'}
          </div>
        ) : (
          requests.map(r => (
            <article key={r.id} className="rounded-2xl bg-card border border-border p-4 shadow-sm">
              <div className="flex items-start gap-2 mb-3">
                <div className="flex flex-wrap gap-2 flex-1">
                  <span className="px-3 py-1 rounded-full border border-border text-xs font-medium text-foreground capitalize">{r.type}</span>
                  <span className="px-3 py-1 rounded-full border border-border text-xs font-medium text-foreground">{r.city}</span>
                  <span className="px-3 py-1 rounded-full border border-border text-xs font-medium text-foreground">{r.status}</span>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{r.date}</span>
              </div>
              <h3 className="font-bold text-foreground">{r.title}</h3>
              <p className="text-primary font-bold text-lg mt-1">{r.price}</p>
              <p className="text-sm text-foreground/80 mt-2">{r.description}</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <a href={r.zwandakoUrl} target="_blank" rel="noopener noreferrer" className="py-2.5 rounded-full border border-border text-primary text-sm font-semibold text-center">Voir détail</a>
                <a href={r.zwandakoUrl} target="_blank" rel="noopener noreferrer" className="py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold text-center">Prendre</a>
              </div>
              <a href={`tel:${r.phone}`} className="mt-2 flex items-center justify-center gap-2 py-2.5 rounded-full border border-border text-foreground text-sm font-semibold">
                <Phone className="h-4 w-4 text-primary" /> Contacter le client
              </a>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
