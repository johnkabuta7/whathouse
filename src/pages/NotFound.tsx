import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <h1 className="text-6xl font-extrabold text-primary mb-2">404</h1>
      <p className="text-sm text-muted-foreground mb-6">Page introuvable</p>
      <Button asChild className="rounded-xl">
        <Link to="/"><Home className="h-4 w-4 mr-2" />Retour à l'accueil</Link>
      </Button>
    </div>
  );
}
