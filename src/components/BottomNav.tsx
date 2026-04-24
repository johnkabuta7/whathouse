import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MessageSquare, Users, User, Plus, UserPlus, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';

const navItems = [
  { label: 'Discussions', icon: MessageSquare, href: '/' },
  { label: 'Contacts', icon: Users, href: '/contacts' },
  { label: 'Profil', icon: User, href: '/profil' },
];

export function BottomNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { themeStyle } = useTheme();
  const isFloating = themeStyle === 'mocha' || themeStyle === 'nature';

  // Hide bottom nav when inside a group
  if (pathname.startsWith('/group/')) return null;

  // Dynamic + button: action depends on the active route
  const plusAction = (() => {
    if (pathname.startsWith('/contacts')) return { label: 'Inviter', icon: UserPlus, run: () => navigate('/contacts?invite=1') };
    if (pathname.startsWith('/profil')) return { label: 'Modifier photo', icon: ImageIcon, run: () => window.dispatchEvent(new CustomEvent('profil:edit-avatar')) };
    return { label: 'Nouveau groupe', icon: Plus, run: () => navigate('/create-group') };
  })();

  if (isFloating) {
    // Mocha = pilule sombre cuivrée. Nature = pilule blanche/bleue inspirée de la référence Tinder-like.
    const isNature = themeStyle === 'nature';
    return (
      <nav className="fixed bottom-3 left-0 right-0 z-50 px-3 pointer-events-none">
        <div className="max-w-lg mx-auto flex items-center justify-center gap-2 pointer-events-auto">
          <div className={cn(
            'flex-1 flex items-center justify-around backdrop-blur-xl border rounded-full px-2 py-1.5',
            isNature
              ? 'bg-card/95 border-border/40 shadow-xl shadow-primary/10'
              : 'bg-card/85 border-border/60 shadow-lg shadow-black/20'
          )}>
            {navItems.map(item => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-full transition-all relative',
                    isActive ? 'bg-primary/15 text-primary' : 'text-muted-foreground'
                  )}
                  aria-label={item.label}
                >
                  <item.icon className="h-[18px] w-[18px]" />
                </Link>
              );
            })}
          </div>
          <button
            onClick={plusAction.run}
            aria-label={plusAction.label}
            className={cn(
              'h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center active:scale-95 transition',
              isNature ? 'shadow-xl shadow-primary/40 ring-4 ring-primary/15' : 'shadow-lg shadow-primary/30'
            )}
          >
            <plusAction.icon className="h-5 w-5" />
          </button>
        </div>
      </nav>
    );
  }

  // ---- Default (classic) — barre fixe sobre ----
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
