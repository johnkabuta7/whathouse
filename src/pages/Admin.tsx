import { useState } from 'react';
import { TrendingUp, ArrowRightLeft, AlertTriangle, Users, Building2, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { adminTransactions, adminStats } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const statusConfig = {
  encaisse: { label: 'Encaissé', cls: 'bg-accent/10 text-accent' },
  en_attente: { label: 'En attente', cls: 'bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]' },
  transfere: { label: 'Transféré', cls: 'bg-primary/10 text-primary' },
};

const filters = ['Tous', 'Encaissés', 'En attente', 'Transférés'] as const;
type AdminFilter = typeof filters[number];

const filterMap: Record<string, AdminFilter> = {
  encaisse: 'Encaissés',
  en_attente: 'En attente',
  transfere: 'Transférés',
};

export default function Admin() {
  const [activeFilter, setActiveFilter] = useState<AdminFilter>('Tous');
  const { toast } = useToast();

  const filtered = adminTransactions.filter(t => {
    if (activeFilter === 'Tous') return true;
    return filterMap[t.status] === activeFilter;
  });

  const handleTransfer = (transactionId: string, ownerName: string) => {
    toast({
      title: 'Transfert effectué',
      description: `Fonds transférés à ${ownerName} avec succès`,
    });
  };

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-5">
      <h1 className="text-xl font-extrabold text-foreground animate-fade-in">Administration</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 animate-slide-up" style={{ animationDelay: '80ms' }}>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 text-center">
            <p className="text-lg font-extrabold text-accent">{adminStats.totalEncaisse.toLocaleString()}€</p>
            <p className="text-[10px] text-muted-foreground">Encaissé</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 text-center">
            <p className="text-lg font-extrabold text-[hsl(var(--warning))]">{adminStats.enAttente.toLocaleString()}€</p>
            <p className="text-[10px] text-muted-foreground">En attente</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 text-center">
            <p className="text-lg font-extrabold text-primary">{adminStats.transfere.toLocaleString()}€</p>
            <p className="text-[10px] text-muted-foreground">Transféré</p>
          </CardContent>
        </Card>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-3 gap-3 animate-slide-up" style={{ animationDelay: '150ms' }}>
        {[
          { label: 'Biens', value: adminStats.totalProperties, icon: Building2, color: 'text-primary bg-primary/10' },
          { label: 'Locataires', value: adminStats.totalTenants, icon: Users, color: 'text-accent bg-accent/10' },
          { label: 'Alertes', value: adminStats.alertsCount, icon: AlertTriangle, color: 'text-destructive bg-destructive/10' },
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
      <div className="animate-slide-up" style={{ animationDelay: '200ms' }}>
        <h2 className="text-sm font-bold text-foreground mb-3">⚠️ Alertes actives</h2>
        <div className="space-y-2">
          <Card className="border-0 shadow-sm ring-1 ring-destructive/20">
            <CardContent className="p-4 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-destructive/10 shrink-0">
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Retard de paiement</p>
                <p className="text-[11px] text-muted-foreground">Paul Kasongo – 950€ en retard de 22 jours (Maison Lemba)</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm ring-1 ring-[hsl(var(--warning))]/20">
            <CardContent className="p-4 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-[hsl(var(--warning))]/10 shrink-0">
                <AlertTriangle className="h-4 w-4 text-[hsl(var(--warning))]" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Paiement partiel</p>
                <p className="text-[11px] text-muted-foreground">Jean Mutombo – 600€ sur 1200€ payés (Apt. Gombe 3B)</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

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
          {filtered.map((t, i) => {
            const sc = statusConfig[t.status];
            return (
              <Card key={t.id} className="border-0 shadow-sm animate-slide-up" style={{ animationDelay: `${300 + i * 50}ms` }}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-bold text-foreground">{t.tenantName}</p>
                      <p className="text-[11px] text-muted-foreground">{t.propertyName} → {t.ownerName}</p>
                    </div>
                    <span className={cn('text-[10px] font-bold px-2.5 py-1 rounded-lg', sc.cls)}>{sc.label}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-lg font-extrabold text-foreground">{t.amount}€</span>
                      <span className="text-[10px] text-muted-foreground ml-2">{t.date}</span>
                    </div>
                    {t.status === 'en_attente' && (
                      <Button
                        size="sm"
                        className="rounded-xl text-xs h-8 active:scale-95"
                        onClick={() => handleTransfer(t.id, t.ownerName)}
                      >
                        <ArrowRightLeft className="h-3 w-3 mr-1" />
                        Transférer
                      </Button>
                    )}
                    {t.status === 'transfere' && (
                      <CheckCircle2 className="h-5 w-5 text-accent" />
                    )}
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
