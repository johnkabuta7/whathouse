import { useMemo, useState } from 'react';
import { Building2, Search, RefreshCw, LogIn, ChevronDown, ExternalLink, Loader2, MapPin, Zap, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useZwandakoLeads, leadPrice, leadTitle, leadCity, leadTxType, type ZwandakoLead } from '@/hooks/use-zwandako-leads';
import { useQueryClient } from '@tanstack/react-query';

type SubTab = 'all' | 'mine';
type TxType = 'acheter' | 'louer' | 'vendre';

const TX_FILTERS: { key: TxType; label: string }[] = [
  { key: 'acheter', label: 'Acheter' },
  { key: 'louer', label: 'Louer' },
  { key: 'vendre', label: 'Vendre' },
];

export default function OffreImmo() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<SubTab>('all');
  const [activeTx, setActiveTx] = useState<TxType | null>(null);
  const [activeCity, setActiveCity] = useState<string | null>(null);
  const [cityOpen, setCityOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const { data: leads, isLoading, isFetching } = useZwandakoLeads(60);

  const source = leads || [];

  const cities = useMemo(() => {
    const set = new Set<string>();
    source.forEach(l => {
      const c = l.city_label || l.province_label;
      if (c) set.add(c);
    });
    return Array.from(set).sort();
  }, [source]);

  const myTakenIds = useMemo(() => {
    try { return new Set(JSON.parse(localStorage.getItem('wh_taken_listings') || '[]').map((x: any) => x.id)); }
    catch { return new Set(); }
  }, [tab]);

  const filtered = useMemo(() => {
    let r = source;
    if (tab === 'mine') r = r.filter(l => myTakenIds.has(`lead_${l.lead_id}`));
    if (activeTx) r = r.filter(l => leadTxType(l) === activeTx);
    if (activeCity) r = r.filter(l => (l.city_label || l.province_label) === activeCity);
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(l =>
        (l.message || '').toLowerCase().includes(q) ||
        leadTitle(l).toLowerCase().includes(q) ||
        leadCity(l).toLowerCase().includes(q)
      );
    }
    return r;
  }, [source, tab, activeTx, activeCity, search, myTakenIds]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['zwandako_leads'] });

  if (!user) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-background p-6 text-center gap-4">
        <h2 className="text-xl font-semibold">Connexion requise</h2>
        <p className="text-sm text-muted-foreground max-w-sm">Vous devez être connecté pour accéder aux demandes des clients.</p>
        <Button onClick={() => navigate('/profil')} className="gap-2"><LogIn className="h-4 w-4" /> Se connecter</Button>
      </div>
    );
  }

  const takeLead = (l: ZwandakoLead) => {
    try {
      const key = 'wh_taken_listings';
      const arr = JSON.parse(localStorage.getItem(key) || '[]');
      const id = `lead_${l.lead_id}`;
      if (arr.find((x: any) => x.id === id)) { toast({ title: 'Déjà pris' }); return; }
      const entry = {
        id,
        title: leadTitle(l),
        description: l.message || '',
        image: null,
        group_id: null,
        takenAt: Date.now(),
        source: 'zwandako_lead',
        lead_id: l.lead_id,
        city: leadCity(l),
        price: leadPrice(l),
        intent: l.intent,
      };
      localStorage.setItem(key, JSON.stringify([entry, ...arr]));
      toast({ title: 'Demande prise', description: 'Ajoutée à Affaires > Affaire en cours.' });
    } catch { /* ignore */ }
  };

  return (
    <div className="h-full w-full flex flex-col bg-background">
      <header className="shrink-0 px-4 pt-6 pb-3 flex items-start gap-3" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 5mm)' }}>
        <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Building2 className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-foreground leading-tight">Offre Immo</h1>
          <p className="text-xs text-muted-foreground">
            {isLoading ? 'Chargement…' : `${source.length} demandes clients · Zwandako`}
          </p>
        </div>
        <button onClick={() => setSearchOpen(s => !s)} className="p-2 rounded-full hover:bg-muted transition" aria-label="Rechercher">
          <Search className="h-5 w-5 text-foreground" />
        </button>
        <button onClick={refresh} disabled={isFetching} className="p-2 rounded-full hover:bg-muted transition disabled:opacity-50" aria-label="Rafraîchir">
          {isFetching ? <Loader2 className="h-5 w-5 text-foreground animate-spin" /> : <RefreshCw className="h-5 w-5 text-foreground" />}
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
              <div className="absolute right-0 top-full mt-1 z-50 min-w-[180px] bg-card border border-border rounded-xl shadow-lg overflow-hidden max-h-64 overflow-y-auto">
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
        {filtered.length === 0 ? (
          <div className="rounded-2xl p-6 bg-primary/10 text-sm text-foreground text-center">
            {isLoading ? 'Chargement des demandes clients…' :
              tab === 'mine' ? 'Aucune demande prise pour le moment.' : 'Aucune demande trouvée pour ces filtres.'}
          </div>
        ) : (
          filtered.map(l => {
            const tx = leadTxType(l);
            return (
              <article key={l.lead_id} className="rounded-2xl bg-card border border-border p-4 shadow-sm">
                <div className="flex items-start gap-2 mb-3">
                  <div className="flex flex-wrap gap-2 flex-1">
                    <span className="px-3 py-1 rounded-full border border-border text-xs font-medium text-foreground capitalize">{tx}</span>
                    <span className="px-3 py-1 rounded-full border border-border text-xs font-medium text-foreground inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" />{leadCity(l)}
                    </span>
                    {l.urgency && (
                      <span className="px-3 py-1 rounded-full bg-destructive/10 border border-destructive/30 text-xs font-medium text-destructive inline-flex items-center gap-1">
                        <Zap className="h-3 w-3" />Urgent
                      </span>
                    )}
                    {l.discreet && (
                      <span className="px-3 py-1 rounded-full bg-muted border border-border text-xs font-medium text-muted-foreground inline-flex items-center gap-1">
                        <EyeOff className="h-3 w-3" />Discret
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{l.created_at_display || ''}</span>
                </div>
                <h3 className="font-bold text-foreground">{leadTitle(l)}</h3>
                <p className="text-primary font-bold text-lg mt-1">
                  {leadPrice(l)}
                  {l.budget_negotiable && <span className="text-xs font-medium text-muted-foreground ml-2">(négociable)</span>}
                </p>
                {l.message && <p className="text-sm text-foreground/80 mt-2 whitespace-pre-line">{l.message}</p>}
                <div className="mt-4">
                  <button
                    onClick={() => takeLead(l)}
                    className="w-full py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold text-center"
                  >
                    Prendre
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground text-center inline-flex items-center justify-center gap-1 w-full">
                  <ExternalLink className="h-3 w-3" />
                  Coordonnées visibles après prise dans « Affaires »
                </p>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
