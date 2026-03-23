import { useState } from 'react';
import { TrendingUp, ArrowRightLeft, AlertTriangle, Users, Building2, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { usePayments, useUpdatePayment, useDashboardStats, useProperties } from '@/hooks/use-data';
import { Skeleton } from '@/components/ui/skeleton';

const statusConfig: Record<string, { label: string; cls: string }> = {
  encaisse: { label: 'Encaissé', cls: 'bg-accent/10 text-accent' },
  en_attente: { label: 'En attente', cls: 'bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]' },
  transfere: { label: 'Transféré', cls: 'bg-primary/10 text-primary' },
};

const filters = ['Tous', 'En attente', 'Transférés'] as const;
type AdminFilter = typeof filters[number];

export default function Admin() {
  const [activeFilter, setActiveFilter] = useState<AdminFilter>('Tous');
  const { toast } = useToast();
  const { data: payments, isLoading } = usePayments();
  const { data: stats } = useDashboardStats();
  const { data: properties } = useProperties();
  const updatePayment = useUpdatePayment();

  if (isLoading || !stats) {
    return (
      <div className="px-4 py-6 max-w-lg mx-auto space-y-4">
        <Skeleton className="h-8 w-40" />
        <div className="grid grid-cols-3 gap-3"><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /></div>
      </div>
    );
  }

  const allPayments = payments || [];
  const filtered = allPayments.filter(p => {
    if (activeFilter === 'Tous') return true;
    if (activeFilter === 'En attente') return p.transfer_status === 'en_attente';
    if (activeFilter === 'Transférés') return p.transfer_status === 'transfere';
    return true;
  });

  const latePayments = allPayments.filter(p => p.status === 'late');

  const handleTransfer = async (paymentId: string, ownerName: string) => {
    try {
      await updatePayment.mutateAsync({ id: paymentId, transfer_status: 'transfere' });
      toast({ title: 'Transfert effectué', description: `Fonds transférés à ${ownerName} avec succès` });
    } catch {
      toast({ title: 'Erreur', description: 'Impossible d\'effectuer le transfert', variant: 'destructive' });
    }
  };

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-5">
      <h1 className="text-xl font-extrabold text-foreground animate-fade-in">Administration</h1>

      <div className="grid grid-cols-3 gap-3 animate-slide-up" style={{ animationDelay: '80ms' }}>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 text-center">
            <p className="text-lg font-extrabold text-accent">{stats.totalEncaisse.toLocaleString()}€</p>
            <p className="text-[10px] text-muted-foreground">Encaissé</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 text-center">
            <p className="text-lg font-extrabold text-[hsl(var(--warning))]">{stats.enAttente.toLocaleString()}€</p>
            <p className="text-[10px] text-muted-foreground">En attente</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 text-center">
            <p className="text-lg font-extrabold text-primary">{stats.transfere.toLocaleString()}€</p>
            <p className="text-[10px] text-muted-foreground">Transféré</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-3 animate-slide-up" style={{ animationDelay: '150ms' }}>
        {[
          { label: 'Biens', value: properties?.length || 0, icon: Building2, color: 'text-primary bg-primary/10' },
          { label: 'Paiements', value: allPayments.length, icon: Users, color: 'text-accent bg-accent/10' },
          { label: 'Alertes', value: latePayments.length, icon: AlertTriangle, color: 'text-destructive bg-destructive/10' },
        ].map(s => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="p-3 flex flex-col items-center gap-1.5">
              <div className={cn('p-2 rounded-xl', s.color)}><s.icon className="h-4 w-4" /></div>
              <p className="text-xl font-extrabold text-foreground">{s.value}</p>
              <p className="text-[10px] font-medium text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alerts */}
      {latePayments.length > 0 && (
        <div className="animate-slide-up" style={{ animationDelay: '200ms' }}>
          <h2 className="text-sm font-bold text-foreground mb-3">⚠️ Alertes actives</h2>
          <div className="space-y-2">
            {latePayments.map(p => (
              <Card key={p.id} className="border-0 shadow-sm ring-1 ring-destructive/20">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-destructive/10 shrink-0">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Retard de paiement</p>
                    <p className="text-[11px] text-muted-foreground">
                      {(p as any).tenant_profile?.first_name} {(p as any).tenant_profile?.last_name} – {Number(p.total_amount)}€ en retard ({(p as any).properties?.name})
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Transactions */}
      <div className="animate-slide-up" style={{ animationDelay: '250ms' }}>
        <h2 className="text-sm font-bold text-foreground mb-3">Transactions</h2>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {filters.map(f => (
            <button key={f} onClick={() => setActiveFilter(f)}
              className={cn('px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all active:scale-95',
                activeFilter === f ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground'
              )}>{f}</button>
          ))}
        </div>

        <div className="space-y-2 mt-3">
          {filtered.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">Aucune transaction</p>}
          {filtered.map((t, i) => {
            const sc = statusConfig[t.transfer_status] || { label: t.transfer_status, cls: '' };
            const tenantName = `${(t as any).tenant_profile?.first_name || ''} ${(t as any).tenant_profile?.last_name || ''}`.trim();
            const ownerName = `${(t as any).owner_profile?.first_name || ''} ${(t as any).owner_profile?.last_name || ''}`.trim();
            return (
              <Card key={t.id} className="border-0 shadow-sm animate-slide-up" style={{ animationDelay: `${300 + i * 50}ms` }}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-bold text-foreground">{tenantName}</p>
                      <p className="text-[11px] text-muted-foreground">{(t as any).properties?.name} → {ownerName}</p>
                    </div>
                    <span className={cn('text-[10px] font-bold px-2.5 py-1 rounded-lg', sc.cls)}>{sc.label}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-lg font-extrabold text-foreground">{Number(t.amount)}€</span>
                      <span className="text-[10px] text-muted-foreground ml-2">{new Date(t.due_date).toLocaleDateString('fr-FR')}</span>
                    </div>
                    {t.transfer_status === 'en_attente' && (
                      <Button size="sm" className="rounded-xl text-xs h-8 active:scale-95"
                        onClick={() => handleTransfer(t.id, ownerName)} disabled={updatePayment.isPending}>
                        <ArrowRightLeft className="h-3 w-3 mr-1" />Transférer
                      </Button>
                    )}
                    {t.transfer_status === 'transfere' && <CheckCircle2 className="h-5 w-5 text-accent" />}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
