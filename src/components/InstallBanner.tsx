import { useEffect, useState } from 'react';
import { Download, X, Apple } from 'lucide-react';
import { usePWAInstall } from '@/contexts/PWAInstallContext';

const DISMISS_KEY = 'wh_install_dismissed';

export function InstallBanner() {
  const { canInstall, isInstalled, promptInstall } = usePWAInstall();
  const [forceShow, setForceShow] = useState(false);
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
  });

  const isIOS = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent);

  const handleClose = () => {
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch {}
    setDismissed(true);
    setForceShow(false);
  };

  const installAndroid = async () => {
    const r = await promptInstall();
    if (r === 'accepted') handleClose();
    else if (r === 'unavailable') {
      // Fallback: open native share so user can "Add to Home Screen" via browser menu
      try {
        await (navigator as any).share?.({ title: 'WhatHouse', url: window.location.origin });
      } catch {}
    }
  };

  const installIOS = async () => {
    // iOS Safari requires user action via the share sheet. Open it directly = one tap.
    try {
      if ((navigator as any).share) {
        await (navigator as any).share({ title: 'WhatHouse', text: 'Ajoutez WhatHouse à l\'écran d\'accueil', url: window.location.origin });
        handleClose();
        return;
      }
    } catch {}
    // Last resort: trigger Android-style prompt if available
    const r = await promptInstall();
    if (r === 'accepted') handleClose();
  };

  useEffect(() => {
    const showHandler = () => {
      try { localStorage.removeItem(DISMISS_KEY); } catch {}
      setDismissed(false);
      setForceShow(true);
    };
    const triggerHandler = () => { isIOS ? installIOS() : installAndroid(); };
    window.addEventListener('wh:show-install-banner', showHandler);
    window.addEventListener('wh:trigger-install', triggerHandler);
    return () => {
      window.removeEventListener('wh:show-install-banner', showHandler);
      window.removeEventListener('wh:trigger-install', triggerHandler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canInstall, isIOS]);

  if (isInstalled) return null;
  if (dismissed && !forceShow) return null;

  return (
    <div
      className="w-full flex items-center gap-2 px-3 py-2 text-white"
      style={{ backgroundColor: '#FC4E00' }}
      role="region"
      aria-label="Installer l'application"
      data-no-swipe
    >
      <Download className="h-5 w-5 shrink-0" />
      <div className="flex-1 min-w-0 leading-tight">
        <div className="text-[13px] font-bold truncate">Installer WhatHouse</div>
        <div className="text-[10px] opacity-90 truncate">Choisissez votre appareil</div>
      </div>
      <button
        onClick={installAndroid}
        className="bg-white text-[#FC4E00] font-semibold text-xs rounded-full px-3 py-1.5 active:scale-95 transition flex items-center gap-1"
        aria-label="Installer sur Android"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor"><path d="M17.6 9.48 19 6.92a.5.5 0 0 0-.86-.51l-1.42 2.58a10.7 10.7 0 0 0-9.44 0L5.86 6.41a.5.5 0 1 0-.86.51l1.4 2.56A8.9 8.9 0 0 0 2 16h20a8.9 8.9 0 0 0-4.4-6.52ZM7 14a1 1 0 1 1 1-1 1 1 0 0 1-1 1Zm10 0a1 1 0 1 1 1-1 1 1 0 0 1-1 1Z"/></svg>
        Android
      </button>
      <button
        onClick={installIOS}
        className="bg-white text-[#FC4E00] font-semibold text-xs rounded-full px-3 py-1.5 active:scale-95 transition flex items-center gap-1"
        aria-label="Installer sur iPhone"
      >
        <Apple className="h-3.5 w-3.5" />
        iPhone
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
