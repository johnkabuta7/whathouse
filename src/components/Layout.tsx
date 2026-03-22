import { Outlet } from 'react-router-dom';
import { MobileHeader } from './MobileHeader';
import { BottomNav } from './BottomNav';

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MobileHeader />
      <main className="flex-1 pt-14 pb-20">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
