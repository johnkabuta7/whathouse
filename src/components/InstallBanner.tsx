import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { usePWAInstall } from '@/contexts/PWAInstallContext';
import { useToast } from '@/hooks/use-toast';

const DISMISS_KEY = 'wh_install_dismissed';

export function InstallBanner() {
  const { canInstall, isInstalled, promptInstall } = usePWAInstall();
  const { toast } = useToast();
  const [forceShow, setForceShow] = useState(false);
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
  });

  // Listen for the manual trigger from the header menu ("Installer l'App")
  useEffect(() => {
    const handler = () => {
      try { localStorage.removeItem(DISMISS_KEY); } catch {}
      setDismissed(false);
      setForceShow(true);
    };
    window.addEventListener('wh:show-install-banner', handler);
    return () => window.removeEventListener('wh:show-install-banner', handler);
  }, []);

  if (isInstalled) return null;
  if (dismissed && !forceShow) return null;

  const handleInstall = async () => {
    if (canInstall) {
      const r = await promptInstall();
      if (r === 'accepted') {
        toast({ title: '✅ WhatHouse ajoutée à l\'écran d\'accueil' });
        handleClose();
      } else if (r === 'dismissed') {
        toast({ title: 'Installation annulée' });
      } else {
        const ua = navigator.userAgent;
        if (/iPhone|iPad|iPod/.test(ua)) {
          toast({ title: 'Sur iPhone', description: 'Touchez Partager puis « Sur l\'écran d\'accueil ».' });
        } else {
          toast({ title: 'Installation indisponible', description: 'Ouvrez le menu du navigateur puis « Installer l\'application ».' });
        }
      }
    } else {
      const ua = navigator.userAgent;
      if (/iPhone|iPad|iPod/.test(ua)) {
        toast({ title: 'Sur iPhone', description: 'Touchez Partager puis « Sur l\'écran d\'accueil ».' });
      } else {
        toast({ title: 'Installation indisponible', description: 'Ouvrez le menu du navigateur puis « Installer l\'application ».' });
      }
    }
  };

  const handleClose = () => {
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch {}
    setDismissed(true);
    setForceShow(false);
  };

  return (
    <div
      className="w-full flex items-center gap-3 px-4 py-2.5 text-white"
      style={{ backgroundColor: '#FC4E00' }}
      role="region"
      aria-label="Installer l'application"
    >
      <Download className="h-6 w-6 shrink-0" />
      <div className="flex-1 min-w-0 leading-tight">
        <div className="text-sm font-bold truncate">Installer WhatHouse</div>
        <div className="text-[11px] opacity-90 truncate">Ajoute l'app à ton écran d'accueil</div>
      </div>
      <button
        onClick={handleInstall}
        className="bg-white text-[#FC4E00] font-semibold text-sm rounded-full px-4 py-1.5 active:scale-95 transition"
      >
        Installer
      </button>
      <button
        onClick={handleClose}
        aria-label="Fermer"
        className="p-1 -mr-1 opacity-90 hover:opacity-100"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}
