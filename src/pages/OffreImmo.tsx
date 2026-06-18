import { LogIn, Globe2, User as UserIcon, ExternalLink, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const LINKS = [
  {
    key: 'all',
    label: 'Toutes les offres',
    description: 'Parcourir toutes les demandes immobilières publiées sur Zwandako.',
    icon: Globe2,
    url: 'https://zwandako.com/demandes-immobilieres/',
  },
  {
    key: 'mine',
    label: 'Mes offres',
    description: 'Retrouver les demandes que vous avez prises ou publiées.',
    icon: UserIcon,
    url: 'https://zwandako.com/mes-demandes/',
  },
  {
    key: 'kyc',
    label: 'Vérification d’identité (KYC)',
    description: 'Compléter la vérification d’identité sur Zwandako pour pouvoir prendre une demande.',
    icon: ShieldCheck,
    url: 'https://zwandako.com/mon-compte/',
  },
];

export default function OffreImmo() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-background p-6 text-center gap-4">
        <h2 className="text-xl font-semibold">Connexion requise</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Vous devez être connecté pour accéder aux demandes immobilières.
        </p>
        <Button onClick={() => navigate('/profil')} className="gap-2">
          <LogIn className="h-4 w-4" /> Se connecter
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-background">
      <header className="shrink-0 px-4 pt-4 pb-3 border-b border-border/60">
        <h1 className="text-lg font-bold leading-tight">Offre Immo</h1>
        <p className="text-[11px] text-muted-foreground">Demandes immobilières · Zwandako</p>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <p className="text-sm text-muted-foreground">
          Les demandes immobilières sont gérées sur Zwandako. Choisissez une action ci-dessous :
        </p>
        {LINKS.map((l) => (
          <a
            key={l.key}
            href={l.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3 p-4 rounded-2xl border border-border bg-card hover:bg-accent/40 active:scale-[0.99] transition"
          >
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <l.icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-sm">{l.label}</h3>
                <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{l.description}</p>
            </div>
          </a>
        ))}
        <p className="text-[11px] text-muted-foreground pt-2">
          Astuce : connectez-vous sur Zwandako avec le même numéro/email que WhatHouse pour retrouver vos demandes.
        </p>
      </div>
    </div>
  );
}
