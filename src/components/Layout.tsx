import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { Share2, UsersRound, Plus } from 'lucide-react';
import { BottomNav } from './BottomNav';
import { useTheme } from '@/contexts/ThemeContext';
import Index from '@/pages/Index';
import Contacts from '@/pages/Contacts';
import Profil from '@/pages/Profil';

const SWIPE_ROUTES = ['/', '/contacts', '/profil'];
const PAGES = [Index, Contacts, Profil];

export function Layout() {
  const { pathname } = useLocation();
  const { themeStyle } = useTheme();
  const navigate = useNavigate();
  const isGroupPage = pathname.startsWith('/group/');
  const isFloating = themeStyle === 'mocha' || themeStyle === 'nature';
  const padBottom = isGroupPage ? '' : isFloating ? 'pb-32' : 'pb-24';

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

    const isInNoSwipe = (target: EventTarget | null) => {
      let el = target as HTMLElement | null;
      while (el) {
        if (el.dataset && el.dataset.noSwipe !== undefined) return true;
        el = el.parentElement;
      }
      return false;
    };

    const onStart = (e: TouchEvent) => {
      if (isInNoSwipe(e.target)) {
        startRef.current = null;
        return;
      }
      const t = e.touches[0];
      startRef.current = { x: t.clientX, y: t.clientY, t: Date.now(), locked: null };
      setAnimating(false);
    };
    const onMove = (e: TouchEvent) => {
      if (!startRef.current) return;
      const t = e.touches[0];
      const dx = t.clientX - startRef.current.x;
      const dy = t.clientY - startRef.current.y;

      // Stricter lock: require clear horizontal intent and a meaningful distance
      if (!startRef.current.locked) {
        if (Math.abs(dx) < 18 && Math.abs(dy) < 18) return;
        // Only lock horizontal if dx is dominant by 2x AND clearly large
        if (Math.abs(dx) > Math.abs(dy) * 2 && Math.abs(dx) > 18) {
          startRef.current.locked = 'h';
        } else {
          startRef.current.locked = 'v';
        }
      }
      if (startRef.current.locked !== 'h') return;

      // Subtract the activation distance so the page doesn't "peek" at edges on quick swipes
      const sign = dx >= 0 ? 1 : -1;
      let next = dx - sign * 18;
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

  // Carousel: always-mounted side-by-side panels for the 3 main routes.
  // Translates by (-swipeIdx * 100%) + dragX.
  if (isSwipeRoute) {
    const translateX = `calc(${-swipeIdx * 100}% + ${dragX}px)`;
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col overflow-hidden">
        <div className={`flex-1 ${padBottom} relative overflow-hidden`}>
          <div
            className="flex h-full w-full"
            style={{
              transform: `translate3d(${translateX}, 0, 0)`,
              transition: animating ? 'transform 220ms cubic-bezier(0.22, 0.61, 0.36, 1)' : 'none',
              willChange: 'transform',
            }}
          >
            {PAGES.map((Page, i) => (
              <div
                key={i}
                className="shrink-0 w-full h-full overflow-y-auto bg-background"
                style={{ width: '100%', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' as any, touchAction: 'pan-y' }}
              >
                <Page />
              </div>
            ))}
          </div>
        </div>
        {/* FAB rendu globalement, conditionnel selon la route active.
            Évite que le FAB d'une page apparaisse sur les autres pages du carousel. */}
        {pathname === '/' && (
          <Link
            to="/publish"
            title="Partager une annonce"
            aria-label="Partager une annonce"
            className="fixed right-4 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition"
            style={{ bottom: 'calc(6rem + env(safe-area-inset-bottom))' }}
          >
            <Share2 className="h-6 w-6" />
          </Link>
        )}
        {pathname === '/contacts' && (
          <button
            onClick={() => navigate('/create-group')}
            title="Créer un groupe"
            aria-label="Créer un groupe"
            className="fixed right-4 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition"
            style={{ bottom: 'calc(6rem + env(safe-area-inset-bottom))' }}
          >
            <UsersRound className="h-6 w-6" />
            <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-card text-primary border-2 border-primary flex items-center justify-center">
              <Plus className="h-3 w-3" />
            </span>
          </button>
        )}
        <BottomNav />
      </div>
    );
  }

  // Non-swipe routes: render the matched route as usual via Outlet.
  return (
    <div className="min-h-[100dvh] bg-background flex flex-col overflow-x-hidden">
      <main className={`flex-1 bg-background ${padBottom}`}>
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
