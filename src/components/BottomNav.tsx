import { Link, useLocation } from 'react-router-dom';
import { MessageSquare, Users, Building2, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';

const navItems = [
  { label: 'Accueil', icon: MessageSquare, href: '/' },
  { label: 'Contacts', icon: Users, href: '/contacts' },
  { label: 'Offre Immo', icon: Building2, href: '/offre-immo' },
  { label: 'Profil', icon: User, href: '/profil' },
];

export function BottomNav() {
  const { pathname } = useLocation();
  const { themeStyle } = useTheme();
  const isFloating = themeStyle === 'mocha' || themeStyle === 'nature';

  // Hide bottom nav when inside a group
  if (pathname.startsWith('/group/')) return null;

  if (isFloating) {
    const isNature = themeStyle === 'nature';

    // === NATURE: 3 cercles séparés (style Tinder/Bumble) ===
    if (isNature) {
      return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pointer-events-none" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 2.5mm)', paddingTop: '0' }}>
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
                      : 'h-12 w-12 bg-transparent text-foreground border-[2.5px] border-foreground/40'
                  )}
                >
                  <item.icon className={cn(isActive ? 'h-6 w-6' : 'h-5 w-5')} />
                </Link>
              );
            })}
          </div>
        </nav>
      );
    }

    // === MOCHA: pilule claire #EBF2FA, icônes noires, sélectionné bleu ===
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-50 px-3 pointer-events-none" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 2.5mm)', paddingTop: '0' }}>
        <div className="max-w-lg mx-auto flex items-center justify-center gap-2 pointer-events-auto">
          <div
            className="flex-1 flex items-center justify-around backdrop-blur-xl border rounded-full px-2 py-1.5"
            style={{ backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.18)' }}
          >
            {navItems.map(item => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'flex flex-col items-center gap-0.5 px-4 py-2 rounded-full transition-all relative',
                  )}
                  style={isActive ? { backgroundColor: 'hsl(var(--primary) / 0.15)' } : undefined}
                  aria-label={item.label}
                >
                  <item.icon className="h-[20px] w-[20px]" style={{ color: isActive ? 'hsl(var(--primary))' : 'hsl(var(--foreground))' }} />
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    );
  }

  // ---- Default (classic) — barre fixe sobre ----
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 2.5mm)' }}>
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
