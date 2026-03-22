import { ReactNode } from 'react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface HorizontalScrollProps {
  children: ReactNode;
  className?: string;
}

export function HorizontalScroll({ children, className = '' }: HorizontalScrollProps) {
  return (
    <ScrollArea className={`w-full whitespace-nowrap ${className}`}>
      <div className="flex gap-4 pb-4">
        {children}
      </div>
      <ScrollBar orientation="horizontal" className="invisible" />
    </ScrollArea>
  );
}
