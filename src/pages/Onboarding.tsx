import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Users, Share2, Globe, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SLIDES = [
  {
    icon: Building2,
    title: 'Bienvenue sur WhatHouse',
    text: "Le réseau Pro Immobilier des agents. Échangez, publiez et trouvez des biens entre vrais professionnels — sans bruit ni amateurs.",
    img: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&h=400&fit=crop',
  },
  {
    icon: Users,
    title: 'Rejoignez des groupes ciblés',
    text: 'Chaque groupe rassemble des agents de votre ville ou spécialité. Demandez à rejoindre, partagez vos annonces et restez à jour en temps réel.',
    img: 'https://images.unsplash.com/photo-1582407947092-987bce739e14?w=800&h=400&fit=crop',
  },
  {
    icon: Share2,
    title: 'Publiez en quelques secondes',
    text: "Collez votre texte d'annonce, ajoutez vos photos, et envoyez. Plus rapide que la concurrence, beaucoup plus organisé.",
    img: 'https://images.unsplash.com/photo-1551836022-deb4988cc6c0?w=800&h=400&fit=crop',
  },
  {
    icon: Globe,
    title: 'Diffusion sur zwandako.com',
    text: "Vos annonces sont automatiquement publiées sur www.zwandako.com pour atteindre des milliers d'acheteurs potentiels.",
    img: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&h=400&fit=crop',
  },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const slide = SLIDES[step];
  const Icon = slide.icon;
  const isLast = step === SLIDES.length - 1;

  const skip = () => { localStorage.setItem('onboarded', '1'); navigate('/login'); };
  const next = () => { if (isLast) skip(); else setStep(s => s + 1); };

  return (
    <div className="h-[100dvh] bg-background flex flex-col overflow-hidden">
      <div className="flex justify-end p-4 shrink-0">
        <button onClick={skip} className="text-sm text-muted-foreground font-medium">Passer</button>
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
        <p className="text-sm text-muted-foreground text-center mt-3 leading-relaxed">{slide.text}</p>
      </div>

      <div className="shrink-0 p-6 max-w-md mx-auto w-full bg-background border-t border-border/50">
        <div className="flex justify-center gap-2 mb-4">
          {SLIDES.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-primary' : 'w-1.5 bg-muted'}`} />
          ))}
        </div>
        <Button onClick={next} className="w-full rounded-full font-semibold bg-primary text-primary-foreground">
          {isLast ? "Commencer" : 'Suivant'} <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
        <button onClick={skip} className="w-full text-center text-xs text-muted-foreground mt-3">Aller à la connexion</button>
      </div>
    </div>
  );
}
