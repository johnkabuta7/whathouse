import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { WPCategory } from '@/lib/api';

interface CategoryFilterProps {
  categories: WPCategory[];
  selectedCategory: number | null;
  onSelectCategory: (id: number | null) => void;
  allLabel?: string;
}

export function CategoryFilter({
  categories,
  selectedCategory,
  onSelectCategory,
  allLabel = 'Tous',
}: CategoryFilterProps) {
  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex gap-2 pb-4">
        <Button
          variant={selectedCategory === null ? 'default' : 'outline'}
          size="sm"
          onClick={() => onSelectCategory(null)}
          className={cn(
            'rounded-full transition-all',
            selectedCategory === null
              ? 'bg-primary text-primary-foreground'
              : 'border-border hover:bg-secondary'
          )}
        >
          {allLabel}
        </Button>
        {categories.map((category) => (
          <Button
            key={category.id}
            variant={selectedCategory === category.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSelectCategory(category.id)}
            className={cn(
              'rounded-full transition-all whitespace-nowrap',
              selectedCategory === category.id
                ? 'bg-primary text-primary-foreground'
                : 'border-border hover:bg-secondary'
            )}
          >
            {category.name}
            {category.count > 0 && (
              <span className="ml-1.5 text-xs opacity-70">({category.count})</span>
            )}
          </Button>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
