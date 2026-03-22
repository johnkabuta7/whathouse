import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { mockPayments } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

const filters = ['Tous', 'Payés', 'En attente', 'En retard'] as const;
type Filter = typeof filters[number];

const statusMap: Record<string, { label: string; className: string; filter: Filter }> = {
  paid: { label: 'Payé', className: 'bg-accent/10 text-accent', filter: 'Payés' },
  pending: { label: 'En attente', className: 'bg-[hsl(38,92%,50%)]/10 text-[hsl(38,92%,50%)]', filter: 'En attente' },
  late: { label: 'En retard', className: 'bg-destructive/10 text-destructive', filter: 'En retard' },
};

export default function Paiements() {
  const [activeFilter, setActiveFilter] = useState<Filter>('Tous');

  const filtered = mockPayments.filter((p) => {
    if (activeFilter === 'Tous') return true;
    return statusMap[p.status].filter === activeFilter;
  });

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-5">
      <h1 className="text-xl font-extrabold text-foreground animate-fade-in">Paiements</h1>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 animate-slide-up" style={{ animationDelay: '80ms' }}>
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all active:scale-95',
              activeFilter === f
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Payment Cards */}
      <div className="space-y-3">
        {filtered.map((payment, i) => {
          const status = statusMap[payment.status];
          const progress = payment.totalAmount > 0 ? (payment.amount / payment.totalAmount) * 100 : 0;
          return (
            <Card
              key={payment.id}
              className="border-0 shadow-sm animate-slide-up"
              style={{ animationDelay: `${150 + i * 60}ms` }}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-bold text-foreground">{payment.tenantName}</p>
                    <p className="text-[11px] text-muted-foreground">{payment.propertyName}</p>
                  </div>
                  <span className={cn('text-[10px] font-bold px-2.5 py-1 rounded-lg', status.className)}>
                    {status.label}
                  </span>
                </div>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-lg font-extrabold text-foreground">{payment.amount}€</span>
                  <span className="text-xs text-muted-foreground">/ {payment.totalAmount}€</span>
                </div>
                {payment.status === 'pending' && (
                  <Progress value={progress} className="h-1.5 mb-2" />
                )}
                <p className="text-[10px] text-muted-foreground">Échéance : {payment.date}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* FAB */}
      <Button
        size="lg"
        className="fixed bottom-24 right-4 h-14 w-14 rounded-2xl shadow-lg z-40 active:scale-95"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
}
