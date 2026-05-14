import { useEffect, useState } from 'react';

const SHOWN_KEY = 'wh_splash_shown_session';

export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), 2700);
    const t2 = setTimeout(() => {
      try { sessionStorage.setItem(SHOWN_KEY, '1'); } catch {}
      onDone();
    }, 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center transition-opacity duration-300"
      style={{ backgroundColor: '#000000', opacity: fading ? 0 : 1 }}
    >
      <img
        src="/whathouse-icon.png"
        alt="WhatHouse"
        width={120}
        height={120}
        style={{ width: 120, height: 120, objectFit: 'contain' }}
      />
    </div>
  );
}

export function shouldShowSplash() {
  try { return sessionStorage.getItem(SHOWN_KEY) !== '1'; } catch { return true; }
}
