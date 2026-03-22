import { ChevronRight, Shield, CreditCard, Bell, HelpCircle, LogOut } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { currentUser } from '@/lib/mock-data';

const menuItems = [
  { label: 'Sécurité', description: 'Mot de passe, 2FA', icon: Shield },
  { label: 'Paiement', description: 'Moyens de paiement', icon: CreditCard },
  { label: 'Notifications', description: 'Préférences alertes', icon: Bell },
  { label: 'Support', description: 'Aide et contact', icon: HelpCircle },
];

export default function Profil() {
  const roleLabel = {
    admin: 'Administrateur',
    proprietaire: 'Propriétaire',
    locataire: 'Locataire',
  }[currentUser.role];

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
      <Card className="border-0 shadow-sm animate-fade-in">
        <CardContent className="p-5 flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl font-extrabold text-primary">
            {currentUser.firstName[0]}{currentUser.name[0]}
          </div>
          <div>
            <p className="text-lg font-extrabold text-foreground">{currentUser.firstName} {currentUser.name}</p>
            <p className="text-xs text-muted-foreground">{currentUser.email}</p>
            <span className="inline-block mt-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg bg-primary/10 text-primary">
              {roleLabel}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm animate-slide-up" style={{ animationDelay: '100ms' }}>
        <CardContent className="p-0 divide-y divide-border">
          {menuItems.map((item) => (
            <button
              key={item.label}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50 transition-colors active:scale-[0.98]"
            >
              <div className="p-2 rounded-xl bg-muted">
                <item.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-foreground">{item.label}</p>
                <p className="text-[10px] text-muted-foreground">{item.description}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </CardContent>
      </Card>

      <button className="w-full flex items-center justify-center gap-2 py-3 text-destructive text-sm font-semibold hover:bg-destructive/5 rounded-xl transition-colors active:scale-95 animate-slide-up" style={{ animationDelay: '200ms' }}>
        <LogOut className="h-4 w-4" />
        Déconnexion
      </button>
    </div>
  );
}
