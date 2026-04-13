import { Building2 } from 'lucide-react';

export function MobileHeader() {
  return (
    <header className="sticky top-0 z-50 bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3 shadow-sm">
      <Building2 className="h-6 w-6" />
      <h1 className="text-base font-bold">Groupe Immobilier</h1>
    </header>
  );
}
