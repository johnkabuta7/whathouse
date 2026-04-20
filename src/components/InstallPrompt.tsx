import { useState } from 'react';
import { Download, X, Share, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/contexts/PWAInstallContext';
import { useToast } from '@/hooks/use-toast';

type Step = 'ask' | 'ios-guide';

export function InstallPrompt({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { canInstall, isInstalled, promptInstall } = usePWAInstall();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<Step>('ask');

  if (!open) return null;

  const handleClose = () => { setStep('ask'); onClose(); };

  const handleYes = async () => {
    setBusy(true);
    if (isInstalled) {
      toast({ title: 'Déjà installée', description: "L'application est déjà sur votre écran d'accueil." });
      setBusy(false);
      handleClose();
      return;
    }
    if (canInstall) {
      const result = await promptInstall();
      if (result === 'accepted') toast({ title: '✅ WhatHouse ajoutée à l\'écran d\'accueil !' });
      else if (result === 'dismissed') toast({ title: 'Installation annulée' });
      setBusy(false);
      handleClose();
      return;
    }
    // No native prompt available
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua)) {
      setStep('ios-guide');
    } else {
      toast({
        title: 'Installation indisponible',
        description: "Ouvrez le menu ⋮ du navigateur puis « Installer l'application ».",
      });
      handleClose();
    }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-foreground/50 flex items-center justify-center p-4 animate-fade-in" onClick={handleClose}>
      <div className="bg-card rounded-2xl p-6 w-full max-w-sm animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex justify-end -mt-2 -mr-2">
          <button onClick={handleClose} className="p-1 text-muted-foreground"><X className="h-5 w-5" /></button>
        </div>

        {step === 'ask' && (
          <>
            <div className="h-16 w-16 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto mb-3">
              <Download className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-center text-foreground">Ajouter WhatHouse</h2>
            <p className="text-sm text-muted-foreground text-center mt-2">
              Voulez-vous ajouter <span className="font-semibold text-foreground">WhatHouse</span> à l'écran d'accueil ?
            </p>
            <div className="flex gap-2 mt-5">
              <Button variant="outline" className="flex-1" onClick={handleClose} disabled={busy}>Non</Button>
              <Button className="flex-1 bg-primary text-primary-foreground" onClick={handleYes} disabled={busy}>
                {busy ? '...' : 'Oui, ajouter'}
              </Button>
            </div>
          </>
        )}

        {step === 'ios-guide' && (
          <>
            <h2 className="text-base font-bold text-center text-foreground">Installer sur iPhone</h2>
            <p className="text-xs text-muted-foreground text-center mt-1 mb-4">Dernière étape — 2 actions :</p>
            <ol className="space-y-3">
              <li className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">1</div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    Appuyez sur <Share className="h-4 w-4 text-primary" /> Partager
                  </p>
                  <p className="text-[11px] text-muted-foreground">en bas de l'écran Safari</p>
                </div>
              </li>
              <li className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">2</div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    "Sur l'écran d'accueil" <Plus className="h-4 w-4 text-primary" />
                  </p>
                  <p className="text-[11px] text-muted-foreground">puis "Ajouter" en haut à droite</p>
                </div>
              </li>
            </ol>
            <Button className="w-full mt-4 bg-primary text-primary-foreground" onClick={handleClose}>J'ai compris</Button>
          </>
        )}

      </div>
    </div>
  );
}
