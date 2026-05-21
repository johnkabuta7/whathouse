import { useEffect, useState } from 'react';
import { Download, X, Apple, Share, Plus } from 'lucide-react';
import { usePWAInstall } from '@/contexts/PWAInstallContext';


const DISMISS_KEY = 'wh_install_dismissed';

export function InstallBanner() {
  const { canInstall, isInstalled, promptInstall } = usePWAInstall();
  const [forceShow, setForceShow] = useState(false);
  const [iosGuideOpen, setIosGuideOpen] = useState(false);
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
  });

  const isIOS = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent);

  useEffect(() => {
    const showHandler = () => {
      try { localStorage.removeItem(DISMISS_KEY); } catch {}
      setDismissed(false);
      setForceShow(true);
    };
    const triggerHandler = () => {
      // Auto-detect platform and trigger install immediately
      if (isIOS) handleIosInstall();
      else handleAndroidInstall();
    };
    window.addEventListener('wh:show-install-banner', showHandler);
    window.addEventListener('wh:trigger-install', triggerHandler);
    return () => {
      window.removeEventListener('wh:show-install-banner', showHandler);
      window.removeEventListener('wh:trigger-install', triggerHandler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canInstall, isIOS]);

  const handleClose = () => {
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch {}
    setDismissed(true);
    setForceShow(false);
  };

  const handleAndroidInstall = async () => {
    if (canInstall) {
      const r = await promptInstall();
      if (r === 'accepted') handleClose();
      return;
    }
    setIosGuideOpen(true);
  };

  const handleIosInstall = async () => {
    if (canInstall) {
      const r = await promptInstall();
      if (r === 'accepted') { handleClose(); return; }
    }
    setIosGuideOpen(true);
  };

  if (isInstalled) return null;
  if (dismissed && !forceShow) return null;

  return (
    <>
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
          <div className="text-[10px] opacity-90 truncate">Choisissez votre appareil ci-dessous</div>
        </div>
        <button
          onClick={handleAndroidInstall}
          className="bg-white text-[#FC4E00] font-semibold text-xs rounded-full px-3 py-1.5 active:scale-95 transition flex items-center gap-1"
          aria-label="Installer sur Android"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor"><path d="M17.6 9.48 19 6.92a.5.5 0 0 0-.86-.51l-1.42 2.58a10.7 10.7 0 0 0-9.44 0L5.86 6.41a.5.5 0 1 0-.86.51l1.4 2.56A8.9 8.9 0 0 0 2 16h20a8.9 8.9 0 0 0-4.4-6.52ZM7 14a1 1 0 1 1 1-1 1 1 0 0 1-1 1Zm10 0a1 1 0 1 1 1-1 1 1 0 0 1-1 1Z"/></svg>
          Android
        </button>
        <button
          onClick={handleIosInstall}
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

      {iosGuideOpen && (
        <div className="fixed inset-0 z-[120] bg-foreground/60 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in" onClick={() => setIosGuideOpen(false)}>
          <div className="bg-card w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl p-5 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center">
                  <Apple className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">Installer sur iPhone</h2>
                  <p className="text-[11px] text-muted-foreground">Fonctionne 100% — 2 étapes</p>
                </div>
              </div>
              <button onClick={() => setIosGuideOpen(false)} className="p-1 text-muted-foreground"><X className="h-5 w-5" /></button>
            </div>

            {!isIOS && (
              <div className="text-[11px] bg-muted/60 text-muted-foreground rounded-lg p-2 mb-3">
                Astuce : ouvrez ce site dans <b>Safari</b> sur votre iPhone, puis suivez ces étapes.
              </div>
            )}

            <ol className="space-y-3 mt-2">
              <li className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">1</div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    Touchez <Share className="h-4 w-4 text-primary" /> Partager
                  </p>
                  <p className="text-[11px] text-muted-foreground">en bas de l'écran Safari</p>
                </div>
              </li>
              <li className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">2</div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    « Sur l'écran d'accueil » <Plus className="h-4 w-4 text-primary" />
                  </p>
                  <p className="text-[11px] text-muted-foreground">puis « Ajouter » en haut à droite</p>
                </div>
              </li>
            </ol>

            <p className="text-[11px] text-muted-foreground mt-3 text-center">
              ✅ L'app apparaît ensuite sur votre écran d'accueil comme une vraie application.
            </p>

            <button
              onClick={() => setIosGuideOpen(false)}
              className="w-full mt-4 bg-primary text-primary-foreground font-semibold rounded-full py-2.5 active:scale-[0.98] transition"
            >
              J'ai compris
            </button>
          </div>
        </div>
      )}
    </>
  );
}
