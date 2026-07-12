import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

type Tab = 'tableau' | 'demandes' | 'matches' | 'carte';

type SearchRequest = {
  id: string;
  clientName: string;
  clientPhone: string;
  description: string;
  createdAt: number;
};

const STORAGE_KEY = 'wh_search_requests';

function loadRequests(): SearchRequest[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}
function saveRequests(rs: SearchRequest[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rs));
}

export default function Affaires() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('tableau');
  const [requests, setRequests] = useState<SearchRequest[]>([]);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => { setRequests(loadRequests()); }, []);

  const addRequest = () => {
    if (!description.trim()) return;
    const next: SearchRequest[] = [
      { id: crypto.randomUUID(), clientName: clientName.trim(), clientPhone: clientPhone.trim(), description: description.trim(), createdAt: Date.now() },
      ...requests,
    ];
    setRequests(next); saveRequests(next);
    setClientName(''); setClientPhone(''); setDescription('');
  };
  const removeRequest = (id: string) => {
    const next = requests.filter(r => r.id !== id);
    setRequests(next); saveRequests(next);
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

  return (
    <div className="h-full w-full flex flex-col bg-background">
      <header className="shrink-0 px-4 pt-6 pb-2" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 5mm)' }}>
        <h1 className="text-2xl font-bold text-foreground">Affaires</h1>
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

      <div className="flex-1 overflow-y-auto p-4 space-y-4" data-no-swipe>
        {tab === 'tableau' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl p-4" style={{ backgroundColor: 'hsl(270 80% 92%)' }}>
                <p className="text-4xl font-bold" style={{ color: 'hsl(270 60% 25%)' }}>{requests.length}</p>
                <p className="text-sm mt-1" style={{ color: 'hsl(270 40% 35%)' }}>Annonces prises</p>
              </div>
              <div className="rounded-2xl p-4" style={{ backgroundColor: 'hsl(270 80% 92%)' }}>
                <p className="text-4xl font-bold" style={{ color: 'hsl(270 60% 25%)' }}>0</p>
                <p className="text-sm mt-1" style={{ color: 'hsl(270 40% 35%)' }}>Activités</p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-2">Notifications</h3>
              <div className="rounded-2xl p-4 bg-primary/10 text-sm text-foreground">
                Les prises d'annonces et nouveaux contacts apparaîtront ici.
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-2">Mon portefeuille</h3>
              <div className="rounded-2xl p-4 bg-primary/10 text-sm text-foreground">
                Dans un groupe, touchez « Prendre l'annonce » pour l'ajouter à votre portefeuille.
              </div>
            </div>
          </>
        )}

        {tab === 'demandes' && (
          <>
            <div className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: 'hsl(270 30% 92%)' }}>
              <div>
                <h3 className="font-semibold text-foreground">Avis de recherche</h3>
                <p className="text-xs text-muted-foreground mt-1">Décrivez le bien recherché : lieu, budget, type et caractéristiques.</p>
              </div>
              <input
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                placeholder="Nom du client"
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm"
              />
              <input
                value={clientPhone}
                onChange={e => setClientPhone(e.target.value)}
                placeholder="Téléphone du client"
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm"
              />
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Ex. Villa 4 chambres à Gombe…"
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm resize-none"
              />
              <button
                onClick={addRequest}
                disabled={!description.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-muted-foreground/20 text-muted-foreground font-semibold text-sm disabled:opacity-60 enabled:bg-primary enabled:text-primary-foreground"
              >
                <Plus className="h-4 w-4" /> Ajouter un match
              </button>
            </div>

            {requests.length === 0 ? (
              <div className="rounded-2xl p-4 bg-primary/10 text-sm text-foreground">
                Aucune demande enregistrée.
              </div>
            ) : (
              <ul className="space-y-2">
                {requests.map(r => (
                  <li key={r.id} className="rounded-2xl border border-border bg-card p-3 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      {r.clientName && <p className="text-sm font-semibold text-foreground">{r.clientName}</p>}
                      {r.clientPhone && <p className="text-xs text-muted-foreground">{r.clientPhone}</p>}
                      <p className="text-sm text-foreground mt-1 break-words">{r.description}</p>
                    </div>
                    <button onClick={() => removeRequest(r.id)} className="p-1.5 rounded-full hover:bg-destructive/10 text-destructive shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {tab === 'matches' && (
          <>
            <h3 className="font-semibold text-foreground">Résultats WhatHouse et Zwandako</h3>
            <div className="rounded-2xl p-4 bg-primary/10 text-sm text-foreground">
              Activez une demande pour lancer la recherche automatique.
            </div>
          </>
        )}

        {tab === 'carte' && (
          <div className="rounded-2xl p-8 bg-primary/10 text-sm text-foreground text-center">
            La vue carte arrive bientôt.
          </div>
        )}
      </div>
    </div>
  );
}
