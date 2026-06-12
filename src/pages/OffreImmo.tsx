import { useRef, useState } from 'react';
import { Loader2, LogIn, Globe2, User as UserIcon, ExternalLink, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

type TabKey = 'all' | 'mine';

const TABS: { key: TabKey; label: string; icon: typeof Globe2; url: string }[] = [
  {
    key: 'all',
    label: 'Toutes les offres',
    icon: Globe2,
    url: 'https://zwandako.com/demandes-immobilieres/?app=whathouse&chrome=0',
  },
  {
    key: 'mine',
    label: 'Mes offres',
    icon: UserIcon,
    url: 'https://zwandako.com/mes-demandes/?app=whathouse&chrome=0',
  },
];

// Décalages (px) pour masquer visuellement le header/footer Zwandako depuis WhatHouse,
// sans toucher au site Zwandako. Ajustables si Zwandako change.
const CROP_TOP = 110;
const CROP_BOTTOM = 80;

export default function OffreImmo() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>('all');
  const [loading, setLoading] = useState<Record<TabKey, boolean>>({ all: true, mine: true });
  const [reloadKey, setReloadKey] = useState<Record<TabKey, number>>({ all: 0, mine: 0 });
  const frameRefs = useRef<Record<TabKey, HTMLIFrameElement | null>>({ all: null, mine: null });

  if (!user) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-background p-6 text-center gap-4">
        <h2 className="text-xl font-semibold">Connexion requise</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Vous devez être connecté pour consulter les demandes immobilières.
        </p>
        <Button onClick={() => navigate('/profil')} className="gap-2">
          <LogIn className="h-4 w-4" /> Se connecter
        </Button>
      </div>
    );
  }

  const current = TABS.find((t) => t.key === tab)!;

  const refresh = () => {
    setLoading((s) => ({ ...s, [tab]: true }));
    setReloadKey((s) => ({ ...s, [tab]: s[tab] + 1 }));
  };

  return (
    <div className="relative h-full w-full flex flex-col bg-background">
      {/* En-tête : titre + onglets + actions */}
      <header className="shrink-0 px-4 pt-3 pb-2 bg-background border-b border-border/60">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-bold leading-tight">Offre Immo</h1>
            <p className="text-[11px] text-muted-foreground">Demandes immobilières · Zwandako</p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={refresh}
              aria-label="Rafraîchir"
              className="h-9 w-9"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.open(current.url.replace('?app=whathouse&chrome=0', ''), '_blank')}
              aria-label="Ouvrir sur Zwandako"
              className="h-9 w-9"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Onglets pilule */}
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-full">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  'flex-1 inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-full text-xs font-semibold transition-all',
                  active
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Zone iframe avec crop visuel haut/bas */}
      <div className="relative flex-1 min-h-0 overflow-hidden bg-background">
        {TABS.map((t) => {
          const isActive = tab === t.key;
          return (
            <div
              key={t.key}
              className={cn(
                'absolute inset-0 transition-opacity',
                isActive ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0',
              )}
            >
              {loading[t.key] && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-background">
                  <Loader2 className="h-7 w-7 animate-spin text-primary" />
                </div>
              )}
              {/* Wrapper qui rogne le header/footer Zwandako visuellement */}
              <div
                className="absolute left-0 right-0 overflow-hidden"
                style={{ top: 0, bottom: 0 }}
              >
                <iframe
                  key={reloadKey[t.key]}
                  ref={(el) => (frameRefs.current[t.key] = el)}
                  src={t.url}
                  title={t.label}
                  onLoad={() => setLoading((s) => ({ ...s, [t.key]: false }))}
                  allow="clipboard-write; encrypted-media; fullscreen"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                  className="border-0 block bg-background"
                  style={{
                    position: 'absolute',
                    top: -CROP_TOP,
                    left: 0,
                    width: '100%',
                    height: `calc(100% + ${CROP_TOP + CROP_BOTTOM}px)`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
