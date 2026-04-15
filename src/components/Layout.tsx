import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';

export function Layout() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 pb-14">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
