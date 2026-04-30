import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
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

  const swipeIdx = SWIPE_ROUTES.indexOf(pathname);
  const isSwipeRoute = swipeIdx !== -1;

  // Live drag offset in px (negative = swiping left → next page)
  const [dragX, setDragX] = useState(0);
  const [animating, setAnimating] = useState(false);
  const startRef = useRef<{ x: number; y: number; t: number; locked: 'h' | 'v' | null } | null>(null);
  const widthRef = useRef<number>(typeof window !== 'undefined' ? window.innerWidth : 390);

  useEffect(() => {
    const onResize = () => { widthRef.current = window.innerWidth; };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Reset drag when route changes
  useEffect(() => {
    setDragX(0);
    setAnimating(false);
  }, [pathname]);

  useEffect(() => {
    if (!isSwipeRoute) return;

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      startRef.current = { x: t.clientX, y: t.clientY, t: Date.now(), locked: null };
      setAnimating(false);
    };
    const onMove = (e: TouchEvent) => {
      if (!startRef.current) return;
      const t = e.touches[0];
      const dx = t.clientX - startRef.current.x;
      const dy = t.clientY - startRef.current.y;

      if (!startRef.current.locked) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        startRef.current.locked = Math.abs(dx) > Math.abs(dy) * 1.2 ? 'h' : 'v';
      }
      if (startRef.current.locked !== 'h') return;

      // clamp at edges (no rubber-band beyond first/last)
      let next = dx;
      if (swipeIdx === 0 && next > 0) next = next * 0.25;
      if (swipeIdx === SWIPE_ROUTES.length - 1 && next < 0) next = next * 0.25;
      setDragX(next);
    };
    const onEnd = () => {
      const start = startRef.current;
      startRef.current = null;
      if (!start || start.locked !== 'h') {
        setDragX(0);
        return;
      }
      const w = widthRef.current;
      const threshold = w * 0.25;
      setAnimating(true);
      if (dragX < -threshold && swipeIdx < SWIPE_ROUTES.length - 1) {
        // animate out to -w then navigate
        setDragX(-w);
        setTimeout(() => navigate(SWIPE_ROUTES[swipeIdx + 1]), 220);
      } else if (dragX > threshold && swipeIdx > 0) {
        setDragX(w);
        setTimeout(() => navigate(SWIPE_ROUTES[swipeIdx - 1]), 220);
      } else {
        setDragX(0);
      }
    };

    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd, { passive: true });
    window.addEventListener('touchcancel', onEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
    };
  }, [isSwipeRoute, swipeIdx, dragX, navigate]);

  const transformStyle = isSwipeRoute
    ? {
        transform: `translate3d(${dragX}px,0,0)`,
        transition: animating ? 'transform 220ms cubic-bezier(0.22, 0.61, 0.36, 1)' : 'none',
        willChange: 'transform',
      }
    : undefined;

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col overflow-x-hidden">
      <main className={`flex-1 bg-background ${padBottom}`} style={transformStyle}>
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
