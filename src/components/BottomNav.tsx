import { Link, useLocation } from 'react-router-dom';
import { Home, Briefcase, Users, Building2, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Accueil', icon: Home, href: '/' },
  { label: 'Affaires', icon: Briefcase, href: '/affaires' },
  { label: 'Répertoire', icon: Users, href: '/contacts' },
  { label: 'Offre Immo', icon: Building2, href: '/offre-immo' },
  { label: 'Profil', icon: User, href: '/profil' },
];

export function BottomNav() {
  const { pathname } = useLocation();

  // Hide bottom nav when inside a group
  if (pathname.startsWith('/group/')) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 px-3 pointer-events-none"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 2.5mm)' }}
    >
      <div className="max-w-lg mx-auto pointer-events-auto">
        <div
          className="flex items-center justify-around rounded-full px-2 py-2 shadow-lg backdrop-blur-xl"
          style={{ backgroundColor: 'hsl(var(--primary) / 0.12)' }}
        >
          {navItems.map(item => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                to={item.href}
                aria-label={item.label}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 rounded-full transition-all',
                  isActive
                    ? 'bg-primary text-primary-foreground px-4 py-1.5 shadow-md'
                    : 'text-foreground/80 px-2 py-1.5'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-semibold leading-none">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
