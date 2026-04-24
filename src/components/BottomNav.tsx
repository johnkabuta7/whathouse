import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MessageSquare, Users, User, Plus, FileText, UserPlus, Image as ImageIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { useAllDrafts } from '@/hooks/use-drafts';

const navItems = [
  { label: 'Discussions', icon: MessageSquare, href: '/' },
  { label: 'Contacts', icon: Users, href: '/contacts' },
  { label: 'Brouillons', icon: FileText, href: '/drafts' },
  { label: 'Profil', icon: User, href: '/profil' },
];

export function BottomNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { themeStyle } = useTheme();
  const drafts = useAllDrafts();
  const isMocha = themeStyle === 'mocha';

  // Hide bottom nav when inside a group
  if (pathname.startsWith('/group/')) return null;

  // Dynamic + button: action depends on the active route
  const plusAction = (() => {
    if (pathname.startsWith('/contacts')) return { label: 'Inviter', icon: UserPlus, run: () => navigate('/contacts?invite=1') };
    if (pathname.startsWith('/drafts')) return { label: 'Nouvelle annonce', icon: Plus, run: () => navigate('/') };
    if (pathname.startsWith('/profil')) return { label: 'Modifier photo', icon: ImageIcon, run: () => window.dispatchEvent(new CustomEvent('profil:edit-avatar')) };
    return { label: 'Nouveau groupe', icon: Plus, run: () => navigate('/create-group') };
  })();

  if (isMocha) {
    return (
      <nav className="fixed bottom-3 left-0 right-0 z-50 px-3 pointer-events-none">
        <div className="max-w-lg mx-auto flex items-center justify-center gap-2 pointer-events-auto">
          <div className="flex-1 flex items-center justify-around bg-card/85 backdrop-blur-xl border border-border/60 rounded-full shadow-lg shadow-black/20 px-2 py-1.5">
            {navItems.map(item => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              const showBadge = item.href === '/drafts' && drafts.length > 0;
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
                  {showBadge && (
                    <span className="absolute top-0.5 right-1.5 h-3.5 min-w-[14px] rounded-full bg-destructive text-[8px] font-bold text-white flex items-center justify-center px-0.5">
                      {drafts.length}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
          <button
            onClick={plusAction.run}
            aria-label={plusAction.label}
            className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30 active:scale-95 transition"
          >
            <plusAction.icon className="h-5 w-5" />
          </button>
        </div>
      </nav>
    );
  }

  // ---- Default (classic / nature) ----
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
      <div className="max-w-lg mx-auto flex items-center justify-around h-14">
        {navItems.map(item => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          const showBadge = item.href === '/drafts' && drafts.length > 0;
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
              {showBadge && (
                <span className="absolute top-0 right-2 h-3.5 min-w-[14px] rounded-full bg-destructive text-[8px] font-bold text-white flex items-center justify-center px-0.5">
                  {drafts.length}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
