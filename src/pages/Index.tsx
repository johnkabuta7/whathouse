import { Link } from 'react-router-dom';
import { Plus, UserPlus, CreditCard, CheckCircle2, Clock, AlertTriangle, ArrowRight, TrendingUp, Building2, Receipt } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { mockPayments, mockActivities, dashboardStats, currentUser } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

const statusCards = [
  { label: 'Payé', value: dashboardStats.paid, icon: CheckCircle2, color: 'text-accent bg-accent/10' },
  { label: 'En attente', value: dashboardStats.pending, icon: Clock, color: 'text-[hsl(38,92%,50%)] bg-[hsl(38,92%,50%)]/10' },
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
  return (
    <div className="px-4 py-6 space-y-6 max-w-lg mx-auto">
      {/* Revenue Card */}
      <Card className="bg-primary text-primary-foreground border-0 overflow-hidden relative animate-fade-in">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 opacity-80" />
            <p className="text-xs font-medium opacity-80">Revenus du mois</p>
          </div>
          <p className="text-3xl font-extrabold tracking-tight">{dashboardStats.totalCollected.toLocaleString()}€</p>
          <p className="text-xs opacity-70 mt-1">sur {dashboardStats.totalRevenue.toLocaleString()}€ attendus</p>
          <div className="mt-4 h-2 bg-primary-foreground/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-foreground/60 rounded-full transition-all duration-700"
              style={{ width: `${(dashboardStats.totalCollected / dashboardStats.totalRevenue) * 100}%` }}
            />
          </div>
          <div className="mt-4">
            <Button size="sm" variant="secondary" asChild className="rounded-xl font-semibold">
              <Link to="/paiements">
                Voir les paiements
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Status Cards */}
      <div className="grid grid-cols-3 gap-3 animate-slide-up" style={{ animationDelay: '100ms' }}>
        {statusCards.map((s) => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="p-3 flex flex-col items-center gap-1.5">
              <div className={cn('p-2 rounded-xl', s.color)}>
                <s.icon className="h-4 w-4" />
              </div>
              <p className="text-2xl font-extrabold text-foreground">{s.value}</p>
              <p className="text-[10px] font-medium text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="animate-slide-up" style={{ animationDelay: '200ms' }}>
        <h2 className="text-sm font-bold text-foreground mb-3">Actions rapides</h2>
        <div className="grid grid-cols-3 gap-3">
          {quickActions.map((action) => (
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

      {/* Recent Activity */}
      <div className="animate-slide-up" style={{ animationDelay: '300ms' }}>
        <h2 className="text-sm font-bold text-foreground mb-3">Activité récente</h2>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0 divide-y divide-border">
            {mockActivities.map((activity) => {
              const Icon = activityIcons[activity.type];
              return (
                <div key={activity.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="p-2 rounded-lg bg-muted shrink-0">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
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
