import { Outlet, useLocation } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { useTheme } from '@/contexts/ThemeContext';

export function Layout() {
  const { pathname } = useLocation();
  const { themeStyle } = useTheme();
  const isGroupPage = pathname.startsWith('/group/');
  const isMocha = themeStyle === 'mocha';

  // Mocha bottom nav floats with extra spacing; default has fixed h-14 bar.
  const padBottom = isGroupPage ? '' : isMocha ? 'pb-24' : 'pb-14';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className={`flex-1 ${padBottom}`}>
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}

