import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { Share2, UserPlus } from 'lucide-react';
import { BottomNav } from './BottomNav';
import { InstallBanner } from './InstallBanner';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import Index from '@/pages/Index';
import Contacts from '@/pages/Contacts';
import OffreImmo from '@/pages/OffreImmo';
import Profil from '@/pages/Profil';
import Affaires from '@/pages/Affaires';

const SWIPE_ROUTES = ['/', '/affaires', '/contacts', '/offre-immo', '/profil'];
const PAGES = [Index, Affaires, Contacts, OffreImmo, Profil];

export function Layout() {
  const { pathname } = useLocation();
  const { themeStyle } = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const requireAuth = (e?: React.MouseEvent | React.SyntheticEvent) => {
    if (user) return true;
    e?.preventDefault();
    e?.stopPropagation();
    toast({ title: 'Connectez-vous pour continuer' });
    navigate('/profil');
    return false;
  };
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
    const onAuthRequired = () => toast({ title: 'Connectez-vous pour continuer' });
    window.addEventListener('wh:auth-required', onAuthRequired);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('wh:auth-required', onAuthRequired);
    };
  }, [toast]);

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

      // Lock direction quickly to keep vertical scroll fluid on the home feed.
      if (!startRef.current.locked) {
        // Lock vertical as soon as any vertical intent is detected — prevents jank while scrolling.
        if (Math.abs(dy) > 8 && Math.abs(dy) >= Math.abs(dx)) {
          startRef.current.locked = 'v';
          return;
        }
        // Require clearly dominant horizontal intent to lock horizontal.
        if (Math.abs(dx) > 14 && Math.abs(dx) > Math.abs(dy) * 2.5) {
          startRef.current.locked = 'h';
        } else {
          return;
        }
      }
      if (startRef.current.locked !== 'h') return;

      const sign = dx >= 0 ? 1 : -1;
      let next = dx - sign * 14;
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
      const threshold = w * 0.22;
      setAnimating(true);
      if (dragX < -threshold && swipeIdx < SWIPE_ROUTES.length - 1) {
        setDragX(-w);
        setTimeout(() => navigate(SWIPE_ROUTES[swipeIdx + 1]), 180);
      } else if (dragX > threshold && swipeIdx > 0) {
        setDragX(w);
        setTimeout(() => navigate(SWIPE_ROUTES[swipeIdx - 1]), 180);
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
      <div className="h-[100dvh] bg-background flex flex-col overflow-hidden">
        <InstallBanner />
        <div className={`flex-1 min-h-0 ${padBottom} relative overflow-hidden`}>
          <div
            className="flex h-full w-full"
            style={{
              transform: `translate3d(${translateX}, 0, 0)`,
              transition: animating ? 'transform 180ms cubic-bezier(0.22, 0.61, 0.36, 1)' : 'none',
              willChange: 'transform',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden' as any,
              transformStyle: 'preserve-3d',
            }}
          >
            {PAGES.map((Page, i) => (
              <div
                key={i}
                className="shrink-0 w-full h-full min-h-0 overflow-y-auto bg-background"
                style={{
                  width: '100%',
                  overscrollBehaviorY: 'contain',
                  WebkitOverflowScrolling: 'touch' as any,
                  touchAction: 'pan-y',
                  transform: 'translateZ(0)',
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden' as any,
                  willChange: 'transform',
                }}
              >
                <Page />
              </div>
            ))}
          </div>
        </div>
        {pathname === '/' && (
          <Link
            to="/publish"
            onClick={(e) => { if (!requireAuth(e)) return; }}
            title="Partager une annonce"
            aria-label="Partager une annonce"
            className="fixed right-4 lg:right-8 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:scale-105 active:scale-95 transition"
            style={{ bottom: 'calc(6rem + env(safe-area-inset-bottom))' }}
          >
            <Share2 className="h-6 w-6" />
          </Link>
        )}
        {pathname === '/contacts' && (
          <button
            onClick={(e) => { if (!requireAuth(e)) return; navigate('/create-group'); }}
            title="Créer un groupe"
            aria-label="Créer un groupe"
            className="fixed right-4 lg:right-8 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition"
            style={{ bottom: 'calc(6rem + env(safe-area-inset-bottom))' }}
          >
            <UserPlus className="h-6 w-6" />
          </button>
        )}
        <BottomNav />
      </div>
    );
  }

  // Non-swipe routes: render the matched route as usual via Outlet.
  return (
    <div className="min-h-[100dvh] bg-background flex flex-col overflow-x-hidden">
      <InstallBanner />
      <main className={`flex-1 bg-background ${padBottom}`}>
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
