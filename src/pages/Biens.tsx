import { useState } from 'react';
import { Plus, MapPin, Users, TrendingUp, ArrowLeft, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useProperties, useAddProperty, useTenantAssignments, useDocuments } from '@/hooks/use-data';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

export default function Biens() {
  const { user } = useAuth();
  const { data: properties, isLoading } = useProperties();
  const { data: allAssignments } = useTenantAssignments();
  const { data: allDocuments } = useDocuments();
  const addProperty = useAddProperty();
  const { toast } = useToast();
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', address: '', type: 'Appartement', rent: '' });

  if (isLoading) {
    return (
      <div className="px-4 py-6 max-w-lg mx-auto space-y-4">
        <Skeleton className="h-8 w-32" /><Skeleton className="h-24 rounded-2xl" /><Skeleton className="h-24 rounded-2xl" />
      </div>
    );
  }

  const property = properties?.find(p => p.id === selectedProperty);
  const propertyTenants = allAssignments?.filter(a => a.property_id === selectedProperty) || [];
  const propertyDocs = allDocuments?.filter(d => d.property_id === selectedProperty) || [];

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
                <span className="text-sm font-bold text-foreground">{Number(property.monthly_rent)}€</span>
                <span className="text-[10px] text-muted-foreground">/mois</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">{propertyTenants.length} locataire{propertyTenants.length > 1 ? 's' : ''}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tenants */}
        <div className="animate-slide-up" style={{ animationDelay: '100ms' }}>
          <h2 className="text-sm font-bold text-foreground mb-3">Locataires</h2>
          {propertyTenants.length === 0 && <p className="text-xs text-muted-foreground">Aucun locataire assigné</p>}
          <div className="space-y-2">
            {propertyTenants.map(t => {
              const profile = t.profiles as any;
              const name = profile ? `${profile.first_name} ${profile.last_name}` : 'Inconnu';
              const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2);
              return (
                <Card key={t.id} className="border-0 shadow-sm">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">{initials}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground">{name}</p>
                      <p className="text-[10px] text-muted-foreground">{Number(t.rent_amount)}€/mois · Depuis {new Date(t.move_in_date).toLocaleDateString('fr-FR')}</p>
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
          {propertyDocs.length === 0 && <p className="text-xs text-muted-foreground">Aucun document</p>}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0 divide-y divide-border">
              {propertyDocs.map(doc => {
                const catLabel = { contrat: 'Contrat', facture: 'Facture', etat_des_lieux: 'État des lieux', autre: 'Autre' }[doc.category] || 'Autre';
                return (
                  <div key={doc.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="p-2 rounded-xl bg-primary/10 shrink-0"><FileText className="h-4 w-4 text-primary" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{doc.name}</p>
                      <p className="text-[10px] text-muted-foreground">{catLabel} · {new Date(doc.created_at).toLocaleDateString('fr-FR')}</p>
                    </div>
                    {doc.file_url && (
                      <Button size="sm" variant="ghost" className="text-xs text-primary active:scale-95" onClick={() => window.open(doc.file_url!, '_blank')}>
                        Télécharger
                      </Button>
                    )}
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
                <p className="text-lg font-extrabold text-accent">{Number(property.monthly_rent)}€</p>
                <p className="text-[10px] text-muted-foreground">Revenu mensuel</p>
              </div>
              <div className="text-center p-3 bg-primary/5 rounded-xl">
                <p className="text-lg font-extrabold text-primary">{(Number(property.monthly_rent) * 12).toLocaleString()}€</p>
                <p className="text-[10px] text-muted-foreground">Revenu annuel</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleAddProperty = async () => {
    if (!addForm.name || !addForm.address || !addForm.rent) return;
    try {
      await addProperty.mutateAsync({
        name: addForm.name,
        address: addForm.address,
        type: addForm.type,
        monthly_rent: Number(addForm.rent),
      });
      toast({ title: 'Bien ajouté', description: `${addForm.name} a été ajouté avec succès` });
      setShowAddForm(false);
      setAddForm({ name: '', address: '', type: 'Appartement', rent: '' });
    } catch {
      toast({ title: 'Erreur', description: 'Impossible d\'ajouter le bien', variant: 'destructive' });
    }
  };

  // Properties list
  const myProperties = user?.role === 'locataire' ? properties?.slice(0, 1) : properties;

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-5">
      <div className="flex items-center justify-between animate-fade-in">
        <h1 className="text-xl font-extrabold text-foreground">
          {user?.role === 'locataire' ? 'Mon logement' : 'Mes biens'}
        </h1>
        {user?.role !== 'locataire' && (
          <Button size="sm" className="rounded-xl font-semibold active:scale-95" onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4 mr-1" />Ajouter
          </Button>
        )}
      </div>

      {(!myProperties || myProperties.length === 0) && (
        <div className="text-center py-12">
          <p className="text-sm font-semibold text-muted-foreground">Aucun bien</p>
          <p className="text-xs text-muted-foreground mt-1">Ajoutez votre premier bien immobilier</p>
        </div>
      )}

      <div className="space-y-3">
        {myProperties?.map((property, i) => {
          const tenantCount = allAssignments?.filter(a => a.property_id === property.id).length || 0;
          return (
            <Card key={property.id} onClick={() => setSelectedProperty(property.id)}
              className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer active:scale-[0.98] animate-slide-up"
              style={{ animationDelay: `${100 + i * 60}ms` }}>
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
                    <span className="text-xs font-bold text-foreground">{Number(property.monthly_rent)}€</span>
                    <span className="text-[10px] text-muted-foreground">/mois</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">{tenantCount} locataire{tenantCount > 1 ? 's' : ''}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

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
                  <button key={t} onClick={() => setAddForm({ ...addForm, type: t })}
                    className={cn('px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95',
                      addForm.type === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    )}>{t}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">Loyer mensuel (€)</label>
              <Input type="number" placeholder="ex: 800" className="rounded-xl" value={addForm.rent} onChange={e => setAddForm({ ...addForm, rent: e.target.value })} />
            </div>
            <Button className="w-full rounded-xl font-semibold active:scale-[0.97]" onClick={handleAddProperty} disabled={addProperty.isPending}>
              {addProperty.isPending ? 'Ajout...' : 'Ajouter le bien'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
