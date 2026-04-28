import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Users, Share2, Globe, Search, FolderTree, Smartphone, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SLIDES = [
  {
    icon: Building2,
    title: 'Bienvenue sur WhatHouse',
    text: "Le réseau Pro Immobilier des agents du Congo. Échangez, publiez et trouvez des biens entre vrais professionnels — sans bruit ni amateurs.",
    bullets: [
      'Vos annonces bien rangées et bien structurées',
      "Une interface pensée pour les agents, pas pour les visiteurs",
      'Un seul endroit pour tout votre travail immobilier',
    ],
    img: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&h=400&fit=crop',
  },
  {
    icon: Users,
    title: 'Un grand réseau d\'agents',
    text: 'Plusieurs groupes d\'agents immobiliers du Congo réunis dans une seule application. Plus le réseau est grand, plus vous trouvez vite ce que vous cherchez.',
    bullets: [
      'Rejoignez les groupes de votre ville ou spécialité',
      'Discutez et collaborez en temps réel',
      'Demandez à rejoindre, l\'admin valide en un clic',
    ],
    img: 'https://images.unsplash.com/photo-1582407947092-987bce739e14?w=800&h=400&fit=crop',
  },
  {
    icon: Smartphone,
    title: 'Pas de stockage saturé',
    text: "Vos photos restent dans le cloud — pas dans votre téléphone. Seules les images que vous enregistrez vous-même occupent de la place. Fini les Go d'images WhatsApp qui remplissent votre stockage.",
    bullets: [
      'Téléphone allégé, batterie préservée',
      'Annonces accessibles depuis n\'importe quel appareil',
      'Sauvegarde automatique et sécurisée',
    ],
    img: 'https://images.unsplash.com/photo-1551836022-deb4988cc6c0?w=800&h=400&fit=crop',
  },
  {
    icon: Search,
    title: 'Recherche intelligente',
    text: "Lancez une recherche dans un groupe parmi des milliers d'annonces et trouvez instantanément ce que vous cherchez. La recherche tolère les fautes d'orthographe, les accents et la ponctuation.",
    bullets: [
      'Recherche par mot-clé, ville, type de bien',
      'Résultats en moins d\'une seconde',
      'Filtrage automatique des annonces qui ne vous concernent pas',
    ],
    img: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&h=400&fit=crop',
  },
  {
    icon: Globe,
    title: 'Diffusion sur zwandako.com',
    text: "Une seule publication suffit : votre annonce part automatiquement sur www.zwandako.com pour atteindre des milliers d'acheteurs potentiels, et reste partagée dans tous les groupes choisis.",
    bullets: [
      'Une publication = une seule annonce sur le site web',
      'Validation par l\'admin avant mise en ligne',
      'Visibilité maximum sans effort supplémentaire',
    ],
    img: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=400&fit=crop',
  },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [skipping, setSkipping] = useState(false);
  const slide = SLIDES[step];
  const Icon = slide.icon;
  const isLast = step === SLIDES.length - 1;

  const goToLogin = () => {
    if (skipping) return;
    setSkipping(true);
    try { localStorage.setItem('onboarded', '1'); } catch {}
    // Force a clean nav even if React hasn't re-rendered yet
    setTimeout(() => navigate('/login', { replace: true }), 0);
  };

  const next = () => { if (isLast) goToLogin(); else setStep(s => s + 1); };

  return (
    <div className="h-[100dvh] bg-background flex flex-col overflow-hidden">
      <div className="flex justify-end p-4 shrink-0">
        <button
          onClick={goToLogin}
          onTouchStart={goToLogin}
          type="button"
          disabled={skipping}
          className="text-sm text-muted-foreground font-medium px-3 py-1.5 rounded-full hover:bg-muted active:bg-muted/70 transition disabled:opacity-60"
        >
          {skipping ? 'Chargement...' : 'Passer'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center px-6 max-w-md mx-auto w-full animate-fade-in" key={step}>
        <div className="w-full h-44 rounded-2xl overflow-hidden mb-6 bg-muted">
          <img
            src={slide.img}
            alt={slide.title}
            className="w-full h-full object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=400&fit=crop'; }}
          />
        </div>
        <div className="h-14 w-14 rounded-2xl bg-primary/15 flex items-center justify-center mb-4">
          <Icon className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-xl font-extrabold text-foreground text-center">{slide.title}</h1>
        <p className="text-sm text-muted-foreground text-center mt-3 leading-relaxed font-normal">{slide.text}</p>
        <ul className="mt-4 space-y-1.5 w-full">
          {slide.bullets.map((b, i) => (
            <li key={i} className="text-xs text-foreground/80 flex gap-2 items-start font-normal">
              <span className="text-primary shrink-0 mt-0.5">✓</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="shrink-0 p-6 max-w-md mx-auto w-full bg-background border-t border-border/50">
        <div className="flex justify-center gap-2 mb-4">
          {SLIDES.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-primary' : 'w-1.5 bg-muted'}`} />
          ))}
        </div>
        <Button onClick={next} type="button" className="w-full rounded-full font-semibold bg-primary text-primary-foreground">
          {isLast ? "Commencer" : 'Suivant'} <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
        <button
          onClick={goToLogin}
          onTouchStart={goToLogin}
          type="button"
          disabled={skipping}
          className="w-full text-center text-xs text-muted-foreground mt-3 py-2 disabled:opacity-60"
        >
          {skipping ? 'Chargement...' : 'Aller à la connexion'}
        </button>
      </div>
    </div>
  );
}
