import { Search, MoreVertical } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';

interface MobileHeaderProps {
  onSearch?: (query: string) => void;
}

export function MobileHeader({ onSearch }: MobileHeaderProps) {
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState('');

  return (
    <header className="sticky top-0 z-50 bg-primary text-primary-foreground shadow-md">
      <div className="px-4 py-3 flex items-center gap-3">
        <h1 className="text-lg font-bold flex-1">Pro Immobilier</h1>
        <button onClick={() => setShowSearch(!showSearch)} className="p-1.5 rounded-full hover:bg-primary-foreground/10 transition-colors">
          <Search className="h-5 w-5" />
        </button>
      </div>
      {showSearch && (
        <div className="px-4 pb-3 animate-fade-in">
          <Input
            value={query}
            onChange={e => { setQuery(e.target.value); onSearch?.(e.target.value); }}
            placeholder="Rechercher..."
            className="rounded-full bg-primary-foreground/10 border-0 text-primary-foreground placeholder:text-primary-foreground/50 text-sm h-9"
            autoFocus
          />
        </div>
      )}
    </header>
  );
}
