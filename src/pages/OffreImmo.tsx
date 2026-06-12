import { useState } from 'react';
import { Loader2 } from 'lucide-react';

export default function OffreImmo() {
  const [loading, setLoading] = useState(true);

  return (
    <div className="relative h-full w-full flex flex-col bg-background">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      <iframe
        src="https://zwandako.com/demandes-immobilieres/"
        title="Offre Immo – Zwandako"
        className="flex-1 w-full border-0"
        onLoad={() => setLoading(false)}
        allow="clipboard-write; encrypted-media; fullscreen"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
      />
    </div>
  );
}
