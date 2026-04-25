import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MessageSquare, Users, User, Plus, Clock, UserCog } from 'lucide-react';
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

  // Dynamic + button: action depends on the active route.
  // Accueil → créer un groupe. Contacts → contacts récents. Profil → modifier le profil.
  const plusAction = (() => {
    if (pathname.startsWith('/contacts')) {
      return { label: 'Contacts récents', icon: Clock, run: () => window.dispatchEvent(new CustomEvent('contacts:show-recent')) };
    }
    if (pathname.startsWith('/profil')) {
      return { label: 'Modifier le profil', icon: UserCog, run: () => window.dispatchEvent(new CustomEvent('profil:edit')) };
    }
    return { label: 'Nouveau groupe', icon: Plus, run: () => navigate('/create-group') };
  })();

  // Bouton + universel : fond rouge, icône blanche.
  const PlusButton = ({ size = 'h-12 w-12' }: { size?: string }) => (
    <button
      onClick={plusAction.run}
      aria-label={plusAction.label}
      className={cn(
        size,
        'rounded-full bg-[#F5432D] text-white flex items-center justify-center active:scale-95 transition shadow-lg shadow-[#F5432D]/40'
      )}
    >
      <plusAction.icon className="h-5 w-5" />
    </button>
  );

  if (isFloating) {
    const isNature = themeStyle === 'nature';

    // === NATURE: 3 cercles séparés (style Tinder/Bumble) ===
    if (isNature) {
      return (
        <nav className="fixed bottom-4 left-0 right-0 z-50 px-4 pointer-events-none">
          <div className="max-w-lg mx-auto flex items-center justify-center gap-3 pointer-events-auto">
            {navItems.map(item => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  aria-label={item.label}
                  className={cn(
                    'rounded-full backdrop-blur-xl flex items-center justify-center transition-all active:scale-95',
                    isActive
                      ? 'h-14 w-14 bg-primary text-primary-foreground shadow-xl shadow-primary/40 ring-4 ring-primary/15'
                      : 'h-12 w-12 bg-card/95 text-muted-foreground border border-border/60 shadow-md'
                  )}
                >
                  <item.icon className={cn(isActive ? 'h-6 w-6' : 'h-5 w-5')} />
                </Link>
              );
            })}
            <PlusButton />
          </div>
        </nav>
      );
    }

    // === MOCHA: pilule sombre + bouton flottant ===
    return (
      <nav className="fixed bottom-3 left-0 right-0 z-50 px-3 pointer-events-none">
        <div className="max-w-lg mx-auto flex items-center justify-center gap-2 pointer-events-auto">
          <div className="flex-1 flex items-center justify-around backdrop-blur-xl border rounded-full px-2 py-1.5 bg-card/85 border-border/60 shadow-lg shadow-black/20">
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
          <PlusButton />
        </div>
      </nav>
    );
  }

  // ---- Default (classic) — barre fixe sobre + bouton + flottant rouge ----
  return (
    <>
      <div className="fixed bottom-16 right-4 z-50">
        <PlusButton size="h-14 w-14" />
      </div>
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
    </>
  );
}
