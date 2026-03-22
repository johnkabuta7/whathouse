import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { currentUser, mockNotifications } from '@/lib/mock-data';

export function MobileHeader() {
  const unreadCount = mockNotifications.filter(n => !n.read).length;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-b border-border">
      <div className="flex h-14 items-center justify-between px-4 max-w-lg mx-auto">
        <div>
          <p className="text-xs text-muted-foreground">Bonjour,</p>
          <p className="text-sm font-bold text-foreground">{currentUser.firstName} 👋</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/notifications" className="relative p-2 rounded-xl hover:bg-muted transition-colors active:scale-95">
            <Bell className="h-5 w-5 text-foreground" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 h-4 w-4 bg-destructive rounded-full text-[10px] font-bold text-destructive-foreground flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </Link>
          <Link to="/profil" className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
            {currentUser.firstName[0]}
          </Link>
        </div>
      </div>
    </header>
  );
}
