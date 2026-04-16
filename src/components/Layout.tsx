import { Outlet, useLocation } from 'react-router-dom';
import { BottomNav } from './BottomNav';

export function Layout() {
  const { pathname } = useLocation();
  const isGroupPage = pathname.startsWith('/group/');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className={`flex-1 ${isGroupPage ? '' : 'pb-14'}`}>
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
