import { Outlet, useLocation } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { useTheme } from '@/contexts/ThemeContext';

export function Layout() {
  const { pathname } = useLocation();
  const { themeStyle } = useTheme();
  const isGroupPage = pathname.startsWith('/group/');
  const isFloating = themeStyle === 'mocha' || themeStyle === 'nature';

  // Mocha + nature bottom navs float with extra spacing; classic uses a fixed h-14 bar.
  const padBottom = isGroupPage ? '' : isFloating ? 'pb-24' : 'pb-14';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className={`flex-1 ${padBottom}`}>
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}

