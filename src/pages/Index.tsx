import { Link } from 'react-router-dom';
import { Plus, UserPlus, CreditCard, CheckCircle2, Clock, AlertTriangle, ArrowRight, TrendingUp, Building2, Receipt } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { mockPayments, mockActivities, dashboardStats, locatairePayments } from '@/lib/mock-data';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const statusCards = [
  { label: 'Payé', value: dashboardStats.paid, icon: CheckCircle2, color: 'text-accent bg-accent/10' },
  { label: 'En attente', value: dashboardStats.pending, icon: Clock, color: 'text-[hsl(var(--warning))] bg-[hsl(var(--warning))]/10' },
  { label: 'En retard', value: dashboardStats.late, icon: AlertTriangle, color: 'text-destructive bg-destructive/10' },
];

const quickActions = [
  { label: 'Ajouter un bien', icon: Plus, href: '/biens' },
  { label: 'Ajouter locataire', icon: UserPlus, href: '/biens' },
  { label: 'Voir paiements', icon: CreditCard, href: '/paiements' },
];

const activityIcons = {
  payment: Receipt,
  reminder: Clock,
  contract: Building2,
  message: CreditCard,
};

export default function Index() {
  const { user } = useAuth();

  // Locataire view
  if (user?.role === 'locataire') {
    const currentPayment = locatairePayments[0];
    const remainingAmount = currentPayment.amount - currentPayment.paid;
    return (
      <div className="px-4 py-6 space-y-6 max-w-lg mx-auto">
        {/* Main Card - Amount Due */}
        <Card className="bg-primary text-primary-foreground border-0 overflow-hidden animate-fade-in">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="h-4 w-4 opacity-80" />
              <p className="text-xs font-medium opacity-80">Loyer restant – {currentPayment.month}</p>
            </div>
            <p className="text-3xl font-extrabold tracking-tight">{remainingAmount}€</p>
            <p className="text-xs opacity-70 mt-1">sur {currentPayment.amount}€ – {currentPayment.propertyName}</p>
            <div className="mt-4 h-2 bg-primary-foreground/20 rounded-full overflow-hidden">
              <div className="h-full bg-primary-foreground/60 rounded-full transition-all duration-700"
                style={{ width: `${(currentPayment.paid / currentPayment.amount) * 100}%` }} />
            </div>
            <div className="mt-4">
              <Button size="sm" variant="secondary" asChild className="rounded-xl font-semibold">
                <Link to="/paiements/payer">
                  Payer maintenant
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Payment History */}
        <div className="animate-slide-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-foreground">Historique des paiements</h2>
            <Link to="/paiements" className="text-xs font-semibold text-primary">Voir tout</Link>
          </div>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0 divide-y divide-border">
              {locatairePayments.slice(0, 4).map(p => {
                const statusConfig = {
                  paid: { label: 'Payé', cls: 'bg-accent/10 text-accent' },
                  pending: { label: 'En cours', cls: 'bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]' },
                  late: { label: 'En retard', cls: 'bg-destructive/10 text-destructive' },
                }[p.status];
                return (
                  <div key={p.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-xs font-semibold text-foreground">{p.month}</p>
                      <p className="text-[10px] text-muted-foreground">{p.propertyName}</p>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">{p.paid}€</span>
                      <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-lg', statusConfig.cls)}>
                        {statusConfig.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
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
                    <div className="p-2.5 rounded-xl bg-primary/10">
                      <action.icon className="h-4 w-4 text-primary" />
                    </div>
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

  // Admin redirects to admin dashboard
  if (user?.role === 'admin') {
    return (
      <div className="px-4 py-6 space-y-6 max-w-lg mx-auto">
        <Card className="bg-primary text-primary-foreground border-0 overflow-hidden animate-fade-in">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 opacity-80" />
              <p className="text-xs font-medium opacity-80">Total encaissé ce mois</p>
            </div>
            <p className="text-3xl font-extrabold tracking-tight">3 050€</p>
            <p className="text-xs opacity-70 mt-1">1 900€ en attente de transfert</p>
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="secondary" asChild className="rounded-xl font-semibold">
                <Link to="/admin">
                  Tableau de bord
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-3 animate-slide-up" style={{ animationDelay: '100ms' }}>
          {[
            { label: 'Biens', value: '5', icon: Building2, color: 'text-primary bg-primary/10' },
            { label: 'Locataires', value: '5', icon: UserPlus, color: 'text-accent bg-accent/10' },
            { label: 'Alertes', value: '2', icon: AlertTriangle, color: 'text-destructive bg-destructive/10' },
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
              { label: 'Propriétaires', icon: UserPlus, href: '/admin' },
              { label: 'Documents', icon: Building2, href: '/documents' },
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

        <div className="animate-slide-up" style={{ animationDelay: '300ms' }}>
          <h2 className="text-sm font-bold text-foreground mb-3">Activité récente</h2>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0 divide-y divide-border">
              {mockActivities.map(activity => {
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
      </div>
    );
  }

  // Proprietaire view (default)
  return (
    <div className="px-4 py-6 space-y-6 max-w-lg mx-auto">
      <Card className="bg-primary text-primary-foreground border-0 overflow-hidden relative animate-fade-in">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 opacity-80" />
            <p className="text-xs font-medium opacity-80">Revenus du mois</p>
          </div>
          <p className="text-3xl font-extrabold tracking-tight">{dashboardStats.totalCollected.toLocaleString()}€</p>
          <p className="text-xs opacity-70 mt-1">sur {dashboardStats.totalRevenue.toLocaleString()}€ attendus</p>
          <div className="mt-4 h-2 bg-primary-foreground/20 rounded-full overflow-hidden">
            <div className="h-full bg-primary-foreground/60 rounded-full transition-all duration-700"
              style={{ width: `${(dashboardStats.totalCollected / dashboardStats.totalRevenue) * 100}%` }} />
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
          {quickActions.map(action => (
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

      <div className="animate-slide-up" style={{ animationDelay: '300ms' }}>
        <h2 className="text-sm font-bold text-foreground mb-3">Activité récente</h2>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0 divide-y divide-border">
            {mockActivities.map(activity => {
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
    </div>
  );
}
