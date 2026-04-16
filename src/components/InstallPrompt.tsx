import { useState } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/contexts/PWAInstallContext';
import { useToast } from '@/hooks/use-toast';

export function InstallPrompt({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { canInstall, isInstalled, promptInstall } = usePWAInstall();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const handleYes = async () => {
    setBusy(true);
    if (isInstalled) {
      toast({ title: 'Déjà installée', description: "L'application est déjà sur votre écran d'accueil." });
      setBusy(false);
      onClose();
      return;
    }
    if (canInstall) {
      const result = await promptInstall();
      if (result === 'accepted') toast({ title: '✅ Application ajoutée à l\'écran d\'accueil !' });
      else if (result === 'dismissed') toast({ title: 'Installation annulée' });
      setBusy(false);
      onClose();
      return;
    }
    // Fallback per platform
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua)) {
      toast({ title: 'Sur iPhone', description: "Appuyez sur le bouton Partager ⬆ puis 'Sur l'écran d'accueil'.", duration: 8000 });
    } else if (/Android/.test(ua)) {
      toast({ title: 'Sur Android', description: "Ouvrez le menu ⋮ du navigateur puis 'Installer l'application'.", duration: 8000 });
    } else {
      toast({ title: 'Non disponible', description: "Ouvrez l'app dans Chrome ou Edge sur mobile pour l'installer." });
    }
    setBusy(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-foreground/50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-card rounded-2xl p-6 w-full max-w-sm animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex justify-end -mt-2 -mr-2">
          <button onClick={onClose} className="p-1 text-muted-foreground"><X className="h-5 w-5" /></button>
        </div>
        <div className="h-16 w-16 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto mb-3">
          <Download className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-lg font-bold text-center text-foreground">Ajouter Pro Immobilier</h2>
        <p className="text-sm text-muted-foreground text-center mt-2">
          Voulez-vous ajouter <span className="font-semibold text-foreground">Pro Immobilier</span> à l'écran d'accueil ?
        </p>
        <div className="flex gap-2 mt-5">
          <Button variant="outline" className="flex-1 rounded-full" onClick={onClose} disabled={busy}>Non</Button>
          <Button className="flex-1 rounded-full bg-primary text-primary-foreground" onClick={handleYes} disabled={busy}>
            {busy ? '...' : 'Oui, ajouter'}
          </Button>
        </div>
      </div>
    </div>
  );
}
