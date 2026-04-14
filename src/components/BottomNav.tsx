import { Link, useLocation } from 'react-router-dom';
import { MessageSquare, Users, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Discussions', icon: MessageSquare, href: '/' },
  { label: 'Contacts', icon: Users, href: '/contacts' },
  { label: 'Profil', icon: User, href: '/profil' },
];

export function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
      <div className="max-w-lg mx-auto flex items-center justify-around h-14">
        {navItems.map(item => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-colors relative',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              {isActive && <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />}
              <item.icon className={cn('h-5 w-5', isActive && 'text-primary')} />
              <span className="text-[10px] font-semibold">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
