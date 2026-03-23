import { Link } from 'react-router-dom';
import { Plus, UserPlus, CreditCard, CheckCircle2, Clock, AlertTriangle, ArrowRight, TrendingUp, Building2, Receipt } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardStats, usePayments, useProperties } from '@/hooks/use-data';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const activityIcons = { payment: Receipt, reminder: Clock, contract: Building2, message: CreditCard };

export default function Index() {
  const { user } = useAuth();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: payments } = usePayments();
  const { data: properties } = useProperties();

  if (!stats || statsLoading) {
    return (
      <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
        <Skeleton className="h-40 rounded-2xl" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-24 rounded-2xl" /><Skeleton className="h-24 rounded-2xl" /><Skeleton className="h-24 rounded-2xl" />
        </div>
      </div>
    );
  }

  const myPayments = payments?.filter(p => p.tenant_id === user?.id) || [];
  const currentPayment = myPayments.find(p => p.status === 'pending');
  const recentActivities = (payments || []).slice(0, 5).map(p => ({
    id: p.id,
    type: 'payment' as const,
    text: `${p.status === 'paid' ? 'Paiement reçu' : p.status === 'late' ? 'Retard détecté' : 'Paiement en attente'} – ${Number(p.amount)}€`,
    time: new Date(p.created_at).toLocaleDateString('fr-FR'),
  }));

  // Locataire view
  if (user?.role === 'locataire') {
    const remaining = currentPayment ? Number(currentPayment.total_amount) - Number(currentPayment.amount) : 0;
    const total = currentPayment ? Number(currentPayment.total_amount) : 0;
    const paid = currentPayment ? Number(currentPayment.amount) : 0;

    return (
      <div className="px-4 py-6 space-y-6 max-w-lg mx-auto">
        <Card className="bg-primary text-primary-foreground border-0 overflow-hidden animate-fade-in">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="h-4 w-4 opacity-80" />
              <p className="text-xs font-medium opacity-80">Loyer restant{currentPayment ? ` – ${currentPayment.month_label}` : ''}</p>
            </div>
            <p className="text-3xl font-extrabold tracking-tight">{remaining}€</p>
            <p className="text-xs opacity-70 mt-1">{total > 0 ? `sur ${total}€` : 'Aucun paiement en attente'}</p>
            {total > 0 && (
              <div className="mt-4 h-2 bg-primary-foreground/20 rounded-full overflow-hidden">
                <div className="h-full bg-primary-foreground/60 rounded-full transition-all duration-700" style={{ width: `${(paid / total) * 100}%` }} />
              </div>
            )}
            <div className="mt-4">
              <Button size="sm" variant="secondary" asChild className="rounded-xl font-semibold">
                <Link to="/paiements/payer">Payer maintenant<ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="animate-slide-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-foreground">Historique des paiements</h2>
            <Link to="/paiements" className="text-xs font-semibold text-primary">Voir tout</Link>
          </div>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0 divide-y divide-border">
              {myPayments.length === 0 && <p className="text-xs text-muted-foreground p-4 text-center">Aucun paiement</p>}
              {myPayments.slice(0, 4).map(p => {
                const statusConfig = { paid: { label: 'Payé', cls: 'bg-accent/10 text-accent' }, pending: { label: 'En cours', cls: 'bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]' }, late: { label: 'En retard', cls: 'bg-destructive/10 text-destructive' } }[p.status] || { label: p.status, cls: '' };
                return (
                  <div key={p.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-xs font-semibold text-foreground">{p.month_label}</p>
                      <p className="text-[10px] text-muted-foreground">{(p as any).properties?.name}</p>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">{Number(p.amount)}€</span>
                      <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-lg', statusConfig.cls)}>{statusConfig.label}</span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        <div className="animate-slide-up" style={{ animationDelay: '200ms' }}>
          <h2 className="text-sm font-bold text-foreground mb-3">Accès rapide</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Mes paiements', icon: CreditCard, href: '/paiements' },
              { label: 'Documents', icon: Building2, href: '/documents' },
              { label: 'Messages', icon: Receipt, href: '/messages' },
            ].map(action => (
              <Link key={action.label} to={action.href}>
                <Card className="border-0 shadow-sm hover:shadow-md transition-shadow active:scale-[0.97] cursor-pointer">
                  <CardContent className="p-3 flex flex-col items-center gap-2">
                    <div className="p-2.5 rounded-xl bg-primary/10"><action.icon className="h-4 w-4 text-primary" /></div>
                    <p className="text-[11px] font-semibold text-foreground text-center leading-tight">{action.label}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Admin view
  if (user?.role === 'admin') {
    return (
      <div className="px-4 py-6 space-y-6 max-w-lg mx-auto">
        <Card className="bg-primary text-primary-foreground border-0 overflow-hidden animate-fade-in">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 opacity-80" />
              <p className="text-xs font-medium opacity-80">Total encaissé ce mois</p>
            </div>
            <p className="text-3xl font-extrabold tracking-tight">{stats.totalEncaisse.toLocaleString()}€</p>
            <p className="text-xs opacity-70 mt-1">{stats.enAttente.toLocaleString()}€ en attente de transfert</p>
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="secondary" asChild className="rounded-xl font-semibold">
                <Link to="/admin">Tableau de bord<ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-3 animate-slide-up" style={{ animationDelay: '100ms' }}>
          {[
            { label: 'Biens', value: properties?.length || 0, icon: Building2, color: 'text-primary bg-primary/10' },
            { label: 'Paiements', value: payments?.length || 0, icon: CreditCard, color: 'text-accent bg-accent/10' },
            { label: 'Alertes', value: stats.late, icon: AlertTriangle, color: 'text-destructive bg-destructive/10' },
          ].map(s => (
            <Card key={s.label} className="border-0 shadow-sm">
              <CardContent className="p-3 flex flex-col items-center gap-1.5">
                <div className={cn('p-2 rounded-xl', s.color)}><s.icon className="h-4 w-4" /></div>
                <p className="text-2xl font-extrabold text-foreground">{s.value}</p>
                <p className="text-[10px] font-medium text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="animate-slide-up" style={{ animationDelay: '200ms' }}>
          <h2 className="text-sm font-bold text-foreground mb-3">Actions rapides</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Transactions', icon: CreditCard, href: '/admin' },
              { label: 'Biens', icon: Building2, href: '/biens' },
              { label: 'Documents', icon: Receipt, href: '/documents' },
            ].map(action => (
              <Link key={action.label} to={action.href}>
                <Card className="border-0 shadow-sm hover:shadow-md transition-shadow active:scale-[0.97] cursor-pointer">
                  <CardContent className="p-3 flex flex-col items-center gap-2">
                    <div className="p-2.5 rounded-xl bg-primary/10"><action.icon className="h-4 w-4 text-primary" /></div>
                    <p className="text-[11px] font-semibold text-foreground text-center leading-tight">{action.label}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {recentActivities.length > 0 && (
          <div className="animate-slide-up" style={{ animationDelay: '300ms' }}>
            <h2 className="text-sm font-bold text-foreground mb-3">Activité récente</h2>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-0 divide-y divide-border">
                {recentActivities.map(activity => {
                  const Icon = activityIcons[activity.type];
                  return (
                    <div key={activity.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="p-2 rounded-lg bg-muted shrink-0"><Icon className="h-4 w-4 text-muted-foreground" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{activity.text}</p>
                        <p className="text-[10px] text-muted-foreground">{activity.time}</p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  }

  // Proprietaire view
  const statusCards = [
    { label: 'Payé', value: stats.paid, icon: CheckCircle2, color: 'text-accent bg-accent/10' },
    { label: 'En attente', value: stats.pending, icon: Clock, color: 'text-[hsl(var(--warning))] bg-[hsl(var(--warning))]/10' },
    { label: 'En retard', value: stats.late, icon: AlertTriangle, color: 'text-destructive bg-destructive/10' },
  ];

  return (
    <div className="px-4 py-6 space-y-6 max-w-lg mx-auto">
      <Card className="bg-primary text-primary-foreground border-0 overflow-hidden relative animate-fade-in">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 opacity-80" />
            <p className="text-xs font-medium opacity-80">Revenus du mois</p>
          </div>
          <p className="text-3xl font-extrabold tracking-tight">{stats.totalCollected.toLocaleString()}€</p>
          <p className="text-xs opacity-70 mt-1">sur {stats.totalRevenue.toLocaleString()}€ attendus</p>
          <div className="mt-4 h-2 bg-primary-foreground/20 rounded-full overflow-hidden">
            <div className="h-full bg-primary-foreground/60 rounded-full transition-all duration-700"
              style={{ width: `${stats.totalRevenue > 0 ? (stats.totalCollected / stats.totalRevenue) * 100 : 0}%` }} />
          </div>
          <div className="mt-4">
            <Button size="sm" variant="secondary" asChild className="rounded-xl font-semibold">
              <Link to="/paiements">Voir les paiements<ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-3 animate-slide-up" style={{ animationDelay: '100ms' }}>
        {statusCards.map(s => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="p-3 flex flex-col items-center gap-1.5">
              <div className={cn('p-2 rounded-xl', s.color)}><s.icon className="h-4 w-4" /></div>
              <p className="text-2xl font-extrabold text-foreground">{s.value}</p>
              <p className="text-[10px] font-medium text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="animate-slide-up" style={{ animationDelay: '200ms' }}>
        <h2 className="text-sm font-bold text-foreground mb-3">Actions rapides</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Ajouter un bien', icon: Plus, href: '/biens' },
            { label: 'Voir paiements', icon: CreditCard, href: '/paiements' },
            { label: 'Documents', icon: Receipt, href: '/documents' },
          ].map(action => (
            <Link key={action.label} to={action.href}>
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow active:scale-[0.97] cursor-pointer">
                <CardContent className="p-3 flex flex-col items-center gap-2">
                  <div className="p-2.5 rounded-xl bg-primary/10"><action.icon className="h-4 w-4 text-primary" /></div>
                  <p className="text-[11px] font-semibold text-foreground text-center leading-tight">{action.label}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {recentActivities.length > 0 && (
        <div className="animate-slide-up" style={{ animationDelay: '300ms' }}>
          <h2 className="text-sm font-bold text-foreground mb-3">Activité récente</h2>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0 divide-y divide-border">
              {recentActivities.map(activity => {
                const Icon = activityIcons[activity.type];
                return (
                  <div key={activity.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="p-2 rounded-lg bg-muted shrink-0"><Icon className="h-4 w-4 text-muted-foreground" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{activity.text}</p>
                      <p className="text-[10px] text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
