import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { usePayments } from '@/hooks/use-data';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useProperties, useCreatePayment } from '@/hooks/use-data';
import { useToast } from '@/hooks/use-toast';

const filters = ['Tous', 'Payés', 'En attente', 'En retard'] as const;
type Filter = typeof filters[number];

const statusMap: Record<string, { label: string; className: string; filter: Filter }> = {
  paid: { label: 'Payé', className: 'bg-accent/10 text-accent', filter: 'Payés' },
  pending: { label: 'En attente', className: 'bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]', filter: 'En attente' },
  late: { label: 'En retard', className: 'bg-destructive/10 text-destructive', filter: 'En retard' },
};

export default function Paiements() {
  const { user } = useAuth();
  const { data: payments, isLoading } = usePayments();
  const { data: properties } = useProperties();
  const createPayment = useCreatePayment();
  const { toast } = useToast();
  const [activeFilter, setActiveFilter] = useState<Filter>('Tous');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newPayment, setNewPayment] = useState({ amount: '', month: '' });

  if (isLoading) {
    return (
      <div className="px-4 py-6 max-w-lg mx-auto space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-24 rounded-2xl" /><Skeleton className="h-24 rounded-2xl" />
      </div>
    );
  }

  const allPayments = payments || [];
  const myPayments = user?.role === 'locataire' ? allPayments.filter(p => p.tenant_id === user.id) : allPayments;

  const filtered = myPayments.filter(p => {
    if (activeFilter === 'Tous') return true;
    return statusMap[p.status]?.filter === activeFilter;
  });

  const handleCreatePayment = async () => {
    if (!newPayment.amount || !newPayment.month || !properties?.length) return;
    const prop = properties[0];
    try {
      await createPayment.mutateAsync({
        property_id: prop.id,
        tenant_id: user!.id,
        owner_id: prop.owner_id,
        amount: 0,
        total_amount: Number(newPayment.amount),
        month_label: newPayment.month,
        status: 'pending',
      });
      toast({ title: 'Paiement créé', description: `${newPayment.amount}€ pour ${newPayment.month}` });
      setShowAddDialog(false);
      setNewPayment({ amount: '', month: '' });
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de créer le paiement', variant: 'destructive' });
    }
  };

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-5">
      <h1 className="text-xl font-extrabold text-foreground animate-fade-in">
        {user?.role === 'locataire' ? 'Mes paiements' : 'Paiements'}
      </h1>

      <div className="flex gap-2 overflow-x-auto pb-1 animate-slide-up" style={{ animationDelay: '80ms' }}>
        {filters.map(f => (
          <button key={f} onClick={() => setActiveFilter(f)}
            className={cn('px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all active:scale-95',
              activeFilter === f ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}>{f}</button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm font-semibold text-muted-foreground">Aucun paiement trouvé</p>
          </div>
        )}
        {filtered.map((payment, i) => {
          const status = statusMap[payment.status] || { label: payment.status, className: '' };
          const progress = Number(payment.total_amount) > 0 ? (Number(payment.amount) / Number(payment.total_amount)) * 100 : 0;
          const tenantName = user?.role === 'locataire' ? payment.month_label : `${(payment as any).tenant_profile?.first_name || ''} ${(payment as any).tenant_profile?.last_name || ''}`.trim();
          const propName = (payment as any).properties?.name || '';

          return (
            <Card key={payment.id} className="border-0 shadow-sm animate-slide-up" style={{ animationDelay: `${150 + i * 60}ms` }}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-bold text-foreground">{tenantName}</p>
                    <p className="text-[11px] text-muted-foreground">{propName}</p>
                  </div>
                  <span className={cn('text-[10px] font-bold px-2.5 py-1 rounded-lg', status.className)}>{status.label}</span>
                </div>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-lg font-extrabold text-foreground">{Number(payment.amount)}€</span>
                  <span className="text-xs text-muted-foreground">/ {Number(payment.total_amount)}€</span>
                </div>
                {payment.status === 'pending' && <Progress value={progress} className="h-1.5 mb-2" />}
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-muted-foreground">Échéance : {new Date(payment.due_date).toLocaleDateString('fr-FR')}</p>
                  {payment.status === 'pending' && user?.role === 'locataire' && (
                    <Button size="sm" asChild className="rounded-xl text-xs h-7 active:scale-95">
                      <Link to="/paiements/payer">Payer</Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {user?.role !== 'locataire' && (
        <Button
          size="lg"
          className="fixed bottom-24 right-4 h-14 w-14 rounded-2xl shadow-lg z-40 active:scale-95"
          onClick={() => setShowAddDialog(true)}
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold">Créer un paiement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">Mois</label>
              <Input placeholder="ex: Mars 2026" className="rounded-xl" value={newPayment.month} onChange={e => setNewPayment(p => ({ ...p, month: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">Montant (€)</label>
              <Input type="number" placeholder="ex: 1200" className="rounded-xl" value={newPayment.amount} onChange={e => setNewPayment(p => ({ ...p, amount: e.target.value }))} />
            </div>
            <Button className="w-full rounded-xl font-semibold" onClick={handleCreatePayment} disabled={createPayment.isPending}>
              {createPayment.isPending ? 'Création...' : 'Créer le paiement'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
