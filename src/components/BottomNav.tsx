import { Link, useLocation } from 'react-router-dom';
import { Home, Utensils, BedDouble, Compass, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Accueil', href: '/', icon: Home },
  { name: 'Restaurants', href: '/restaurants', icon: Utensils },
  { name: 'Séjours', href: '/sejours', icon: BedDouble },
  { name: 'Attractions', href: '/attractions', icon: Compass },
  { name: 'Profil', href: '/profil', icon: User },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border safe-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[64px] rounded-lg transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <item.icon className={cn('h-5 w-5', isActive && 'fill-primary/20')} />
              <span className="text-xs font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
