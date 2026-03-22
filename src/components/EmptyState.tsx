import { SearchX } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
}

export function EmptyState({
  title = 'Aucun résultat',
  description = 'Aucun élément trouvé pour votre recherche.',
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="bg-secondary rounded-full p-4 mb-4">
        <SearchX className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="font-display text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-md">{description}</p>
    </div>
  );
}
