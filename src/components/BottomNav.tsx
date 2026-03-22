import { Link, useLocation } from 'react-router-dom';
import { Home, CreditCard, MessageSquare, Building2, User, Shield, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

export function BottomNav() {
  const location = useLocation();
  const { user } = useAuth();

  if (!user) return null;

  const navigation = user.role === 'admin'
    ? [
        { name: 'Accueil', href: '/', icon: Home },
        { name: 'Admin', href: '/admin', icon: Shield },
        { name: 'Messages', href: '/messages', icon: MessageSquare },
        { name: 'Documents', href: '/documents', icon: FileText },
        { name: 'Profil', href: '/profil', icon: User },
      ]
    : user.role === 'locataire'
    ? [
        { name: 'Accueil', href: '/', icon: Home },
        { name: 'Paiements', href: '/paiements', icon: CreditCard },
        { name: 'Messages', href: '/messages', icon: MessageSquare },
        { name: 'Documents', href: '/documents', icon: FileText },
        { name: 'Profil', href: '/profil', icon: User },
      ]
    : [
        { name: 'Accueil', href: '/', icon: Home },
        { name: 'Paiements', href: '/paiements', icon: CreditCard },
        { name: 'Messages', href: '/messages', icon: MessageSquare },
        { name: 'Biens', href: '/biens', icon: Building2 },
        { name: 'Profil', href: '/profil', icon: User },
      ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border safe-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navigation.map(item => {
          const isActive = location.pathname === item.href ||
            (item.href !== '/' && location.pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 px-3 py-2 min-w-[56px] rounded-xl transition-all duration-200',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground active:scale-95'
              )}
            >
              <div className={cn('p-1 rounded-lg transition-colors duration-200', isActive && 'bg-primary/10')}>
                <item.icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className="text-[10px] font-semibold">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
