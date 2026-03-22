import { Plus, MapPin, Users, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { mockProperties } from '@/lib/mock-data';

export default function Biens() {
  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-5">
      <div className="flex items-center justify-between animate-fade-in">
        <h1 className="text-xl font-extrabold text-foreground">Mes biens</h1>
        <Button size="sm" className="rounded-xl font-semibold active:scale-95">
          <Plus className="h-4 w-4 mr-1" />
          Ajouter
        </Button>
      </div>

      <div className="space-y-3">
        {mockProperties.map((property, i) => (
          <Card
            key={property.id}
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
                <span className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-primary/10 text-primary">
                  {property.type}
                </span>
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
    </div>
  );
}
