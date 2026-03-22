import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  text?: string;
}

export function LoadingSpinner({ text = 'Chargement...' }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <Loader2 className="h-10 w-10 text-primary animate-spin" />
      <p className="mt-4 text-muted-foreground">{text}</p>
    </div>
  );
}
