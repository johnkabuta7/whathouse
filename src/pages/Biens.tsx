import { useState } from 'react';
import { Plus, MapPin, Users, TrendingUp, ArrowLeft, FileText, CreditCard, Star, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { mockProperties, tenantProfiles, TenantInfo } from '@/lib/mock-data';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const badgeConfig = {
  fiable: { label: 'Fiable', cls: 'bg-accent/10 text-accent' },
  moyen: { label: 'Moyen', cls: 'bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]' },
  risque: { label: 'Risque', cls: 'bg-destructive/10 text-destructive' },
};

export default function Biens() {
  const { user } = useAuth();
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<TenantInfo | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', address: '', type: 'Appartement', rent: '' });

  const property = mockProperties.find(p => p.id === selectedProperty);

  // Tenant profile modal
  if (selectedTenant) {
    const badge = badgeConfig[selectedTenant.badge];
    return (
      <div className="px-4 py-6 max-w-lg mx-auto space-y-5">
        <button onClick={() => setSelectedTenant(null)} className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground active:scale-95">
          <ArrowLeft className="h-4 w-4" /> Retour
        </button>

        {/* Tenant Header */}
        <Card className="border-0 shadow-sm animate-fade-in">
          <CardContent className="p-5 text-center">
            <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center text-3xl font-extrabold text-primary mx-auto mb-3">
              {selectedTenant.name.split(' ').map(n => n[0]).join('')}
            </div>
            <p className="text-lg font-extrabold text-foreground">{selectedTenant.name}</p>
            {selectedTenant.verified && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent mt-1">
                ✅ Identité vérifiée
              </span>
            )}
            <div className="flex items-center justify-center gap-1 mt-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={cn('h-4 w-4', i < Math.round(selectedTenant.rating) ? 'text-[hsl(var(--warning))] fill-[hsl(var(--warning))]' : 'text-muted')} />
              ))}
              <span className="text-sm font-bold text-foreground ml-1">{selectedTenant.rating}</span>
            </div>
            <span className={cn('inline-block mt-2 text-[10px] font-bold px-3 py-1 rounded-lg', badge.cls)}>
              {badge.label}
            </span>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 animate-slide-up" style={{ animationDelay: '100ms' }}>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-extrabold text-accent">{selectedTenant.onTimeRate}%</p>
              <p className="text-[10px] text-muted-foreground">Paiements à temps</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-extrabold text-destructive">{selectedTenant.lateCount}</p>
              <p className="text-[10px] text-muted-foreground">Retards</p>
            </CardContent>
          </Card>
        </div>

        {/* Payment History */}
        <div className="animate-slide-up" style={{ animationDelay: '200ms' }}>
          <h2 className="text-sm font-bold text-foreground mb-3">Historique paiements</h2>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0 divide-y divide-border">
              {selectedTenant.paymentHistory.map(p => {
                const sc = { paid: 'bg-accent/10 text-accent', pending: 'bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]', late: 'bg-destructive/10 text-destructive' }[p.status];
                const sl = { paid: 'Payé', pending: 'En cours', late: 'En retard' }[p.status];
                return (
                  <div key={p.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-xs font-semibold text-foreground">{p.date}</p>
                      <p className="text-[10px] text-muted-foreground">{p.amount}€</p>
                    </div>
                    <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-lg', sc)}>{sl}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Reviews */}
        <div className="animate-slide-up" style={{ animationDelay: '300ms' }}>
          <h2 className="text-sm font-bold text-foreground mb-3">Avis</h2>
          <div className="space-y-2">
            {selectedTenant.reviews.map((r, i) => (
              <Card key={i} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-xs font-bold text-foreground">{r.author}</p>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <Star key={j} className={cn('h-3 w-3', j < r.rating ? 'text-[hsl(var(--warning))] fill-[hsl(var(--warning))]' : 'text-muted')} />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{r.text}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{r.date}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Contact Info */}
        <Card className="border-0 shadow-sm animate-slide-up" style={{ animationDelay: '400ms' }}>
          <CardContent className="p-4 space-y-2">
            <h3 className="text-sm font-bold text-foreground">Contact</h3>
            <p className="text-xs text-muted-foreground">📧 {selectedTenant.email}</p>
            <p className="text-xs text-muted-foreground">📱 {selectedTenant.phone}</p>
            <p className="text-xs text-muted-foreground">📅 Emménagé le {selectedTenant.moveInDate}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Property detail
  if (property) {
    return (
      <div className="px-4 py-6 max-w-lg mx-auto space-y-5">
        <button onClick={() => setSelectedProperty(null)} className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground active:scale-95">
          <ArrowLeft className="h-4 w-4" /> Mes biens
        </button>

        <Card className="border-0 shadow-sm animate-fade-in">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-lg font-extrabold text-foreground">{property.name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">{property.address}</p>
                </div>
              </div>
              <span className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-primary/10 text-primary">{property.type}</span>
            </div>
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-accent" />
                <span className="text-sm font-bold text-foreground">{property.monthlyRevenue}€</span>
                <span className="text-[10px] text-muted-foreground">/mois</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">{property.tenantCount} locataire{property.tenantCount > 1 ? 's' : ''}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tenants */}
        <div className="animate-slide-up" style={{ animationDelay: '100ms' }}>
          <h2 className="text-sm font-bold text-foreground mb-3">Locataires</h2>
          <div className="space-y-2">
            {property.tenants.map(t => {
              const badge = badgeConfig[t.badge];
              return (
                <Card
                  key={t.id}
                  className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98]"
                  onClick={() => setSelectedTenant(t)}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                      {t.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground">{t.name}</p>
                      <p className="text-[10px] text-muted-foreground">{t.rentAmount}€/mois</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {t.verified && <span className="text-xs">✅</span>}
                      <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-lg', badge.cls)}>{badge.label}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Documents */}
        <div className="animate-slide-up" style={{ animationDelay: '200ms' }}>
          <h2 className="text-sm font-bold text-foreground mb-3">Documents</h2>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0 divide-y divide-border">
              {property.documents.map(doc => {
                const catLabel = { contrat: 'Contrat', facture: 'Facture', etat_des_lieux: 'État des lieux', autre: 'Autre' }[doc.category];
                return (
                  <div key={doc.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="p-2 rounded-xl bg-primary/10 shrink-0"><FileText className="h-4 w-4 text-primary" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{doc.name}</p>
                      <p className="text-[10px] text-muted-foreground">{catLabel} · {doc.date} · {doc.size}</p>
                    </div>
                    <Button size="sm" variant="ghost" className="text-xs text-primary active:scale-95">
                      Télécharger
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Rentability */}
        <Card className="border-0 shadow-sm animate-slide-up" style={{ animationDelay: '300ms' }}>
          <CardContent className="p-4">
            <h3 className="text-sm font-bold text-foreground mb-3">Rentabilité</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-accent/5 rounded-xl">
                <p className="text-lg font-extrabold text-accent">{property.monthlyRevenue}€</p>
                <p className="text-[10px] text-muted-foreground">Revenu mensuel</p>
              </div>
              <div className="text-center p-3 bg-primary/5 rounded-xl">
                <p className="text-lg font-extrabold text-primary">{(property.monthlyRevenue * 12).toLocaleString()}€</p>
                <p className="text-[10px] text-muted-foreground">Revenu annuel</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Properties list
  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-5">
      <div className="flex items-center justify-between animate-fade-in">
        <h1 className="text-xl font-extrabold text-foreground">
          {user?.role === 'locataire' ? 'Mon logement' : 'Mes biens'}
        </h1>
        {user?.role !== 'locataire' && (
          <Button size="sm" className="rounded-xl font-semibold active:scale-95" onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Ajouter
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {(user?.role === 'locataire' ? mockProperties.slice(0, 1) : mockProperties).map((property, i) => (
          <Card
            key={property.id}
            onClick={() => setSelectedProperty(property.id)}
            className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer active:scale-[0.98] animate-slide-up"
            style={{ animationDelay: `${100 + i * 60}ms` }}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-bold text-foreground">{property.name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <p className="text-[11px] text-muted-foreground">{property.address}</p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-primary/10 text-primary">{property.type}</span>
              </div>
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-accent" />
                  <span className="text-xs font-bold text-foreground">{property.monthlyRevenue}€</span>
                  <span className="text-[10px] text-muted-foreground">/mois</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">{property.tenantCount} locataire{property.tenantCount > 1 ? 's' : ''}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Property Dialog */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold">Ajouter un bien</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">Nom du bien</label>
              <Input placeholder="ex: Apt. Gombe 4A" className="rounded-xl" value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">Adresse</label>
              <Input placeholder="ex: 10 Rue de la Paix" className="rounded-xl" value={addForm.address} onChange={e => setAddForm({ ...addForm, address: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">Type</label>
              <div className="flex gap-2 flex-wrap">
                {['Appartement', 'Studio', 'Maison', 'Duplex'].map(t => (
                  <button
                    key={t}
                    onClick={() => setAddForm({ ...addForm, type: t })}
                    className={cn(
                      'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95',
                      addForm.type === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">Loyer mensuel (€)</label>
              <Input type="number" placeholder="ex: 800" className="rounded-xl" value={addForm.rent} onChange={e => setAddForm({ ...addForm, rent: e.target.value })} />
            </div>
            <Button className="w-full rounded-xl font-semibold active:scale-[0.97]" onClick={() => { setShowAddForm(false); setAddForm({ name: '', address: '', type: 'Appartement', rent: '' }); }}>
              Ajouter le bien
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
