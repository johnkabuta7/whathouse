import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { BottomNav } from './BottomNav';
import { useTheme } from '@/contexts/ThemeContext';

const SWIPE_ROUTES = ['/', '/contacts', '/profil'];

export function Layout() {
  const { pathname } = useLocation();
  const { themeStyle } = useTheme();
  const navigate = useNavigate();
  const isGroupPage = pathname.startsWith('/group/');
  const isFloating = themeStyle === 'mocha' || themeStyle === 'nature';

  const padBottom = isGroupPage ? '' : isFloating ? 'pb-24' : 'pb-16';

  // Swipe left/right between the 3 main pages
  const touchStart = useRef<{ x: number; y: number; t: number } | null>(null);
  const swipeIdx = SWIPE_ROUTES.indexOf(pathname);

  useEffect(() => {
    if (swipeIdx === -1) return;

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      touchStart.current = { x: t.clientX, y: t.clientY, t: Date.now() };
    };
    const onEnd = (e: TouchEvent) => {
      if (!touchStart.current) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStart.current.x;
      const dy = t.clientY - touchStart.current.y;
      const dt = Date.now() - touchStart.current.t;
      touchStart.current = null;
      if (dt > 600) return;
      if (Math.abs(dy) > 60) return; // mostly vertical = scroll
      if (Math.abs(dx) < 70) return;

      if (dx < 0 && swipeIdx < SWIPE_ROUTES.length - 1) {
        navigate(SWIPE_ROUTES[swipeIdx + 1]);
      } else if (dx > 0 && swipeIdx > 0) {
        navigate(SWIPE_ROUTES[swipeIdx - 1]);
      }
    };
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchend', onEnd);
    };
  }, [swipeIdx, navigate]);

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <main className={`flex-1 ${padBottom}`}>
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
