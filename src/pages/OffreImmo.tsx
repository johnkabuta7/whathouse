import { useState } from 'react';
import { Loader2, LogIn } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function OffreImmo() {
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

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

  // chrome=0 / app=whathouse : à utiliser côté Zwandako (CSS) pour masquer
  // header, menu burger, footer, bouton "Publier ma demande" et formulaire de filtres.
  const src = 'https://zwandako.com/demandes-immobilieres/?app=whathouse&chrome=0';

  return (
    <div className="relative h-full w-full flex flex-col bg-background">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      <iframe
        src={src}
        title="Offre Immo – Zwandako"
        className="flex-1 w-full border-0"
        onLoad={() => setLoading(false)}
        allow="clipboard-write; encrypted-media; fullscreen"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
      />
    </div>
  );
}
