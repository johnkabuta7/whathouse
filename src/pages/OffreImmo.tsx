import { useMemo, useState } from 'react';
import { Building2, Search, RefreshCw, Phone, LogIn } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

type SubTab = 'all' | 'mine';

const FILTERS = ['Gombe', 'Appartement', 'Disponible', 'Achat', 'Location'];

// Placeholder demo data — remplacer par un fetch Zwandako plus tard.
const DEMO_REQUESTS = [
  {
    id: '1',
    tags: ['Location', 'Disponible'],
    date: "Aujourd'hui",
    title: 'Appartement meublé · Gombe',
    price: '1 000 - 1 500 $',
    description: 'Client cherche un appartement 2 chambres, sécurisé, proche boulevard du 30 Juin.',
    phone: '+243900000000',
    zwandakoUrl: 'https://zwandako.com/demandes-immobilieres/',
  },
  {
    id: '2',
    tags: ['Achat', 'Disponible'],
    date: 'Hier',
    title: 'Maison · Limete',
    price: '120 000 $ max',
    description: 'Recherche maison avec cour, minimum 3 chambres.',
    phone: '+243900000001',
    zwandakoUrl: 'https://zwandako.com/demandes-immobilieres/',
  },
];

export default function OffreImmo() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<SubTab>('all');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const requests = useMemo(() => {
    let r = DEMO_REQUESTS;
    if (tab === 'mine') r = [];
    if (activeFilter) r = r.filter(x => x.tags.includes(activeFilter) || x.title.includes(activeFilter));
    if (search) r = r.filter(x => x.title.toLowerCase().includes(search.toLowerCase()) || x.description.toLowerCase().includes(search.toLowerCase()));
    return r;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, activeFilter, search, refreshKey]);

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
          <p className="text-xs text-muted-foreground">Demandes clients natives</p>
        </div>
        <button onClick={() => setSearchOpen(s => !s)} className="p-2 rounded-full hover:bg-muted transition" aria-label="Rechercher">
          <Search className="h-5 w-5 text-foreground" />
        </button>
        <button onClick={() => setRefreshKey(k => k + 1)} className="p-2 rounded-full hover:bg-muted transition" aria-label="Rafraîchir">
          <RefreshCw className="h-5 w-5 text-foreground" />
        </button>
      </header>

      {searchOpen && (
        <div className="px-4 pb-2" data-no-swipe>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher une demande…"
            autoFocus
            className="w-full px-4 py-2.5 rounded-full border border-border bg-background text-sm"
          />
        </div>
      )}

      <div className="shrink-0 flex items-center border-b border-border">
        {[
          { key: 'all', label: 'Toutes les demandes' },
          { key: 'mine', label: 'Mes demandes' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as SubTab)}
            className={`flex-1 py-3 text-sm font-semibold transition-colors relative ${tab === t.key ? 'text-primary' : 'text-primary/60'}`}
          >
            {t.label}
            {tab === t.key && <span className="absolute bottom-0 left-4 right-4 h-[3px] bg-primary rounded-full" />}
          </button>
        ))}
      </div>

      <div className="shrink-0 px-4 py-3 overflow-x-auto flex gap-2 no-scrollbar" data-no-swipe>
        {FILTERS.map(f => {
          const active = activeFilter === f;
          return (
            <button
              key={f}
              onClick={() => setActiveFilter(active ? null : f)}
              className={`shrink-0 px-4 py-1.5 rounded-full border text-sm font-medium transition ${active ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-foreground border-border'}`}
            >
              {f}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3" data-no-swipe>
        {requests.length === 0 ? (
          <div className="rounded-2xl p-6 bg-primary/10 text-sm text-foreground text-center">
            {tab === 'mine' ? 'Aucune demande prise pour le moment.' : 'Aucune demande trouvée.'}
          </div>
        ) : (
          requests.map(r => (
            <article key={r.id} className="rounded-2xl bg-card border border-border p-4 shadow-sm">
              <div className="flex items-start gap-2 mb-3">
                <div className="flex flex-wrap gap-2 flex-1">
                  {r.tags.map(t => (
                    <span key={t} className="px-3 py-1 rounded-full border border-border text-xs font-medium text-foreground">{t}</span>
                  ))}
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
