import { useState } from 'react';
import { ChevronRight, Shield, CreditCard, Bell, HelpCircle, LogOut, ArrowLeft, Lock, Smartphone, Mail, Phone, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

type SubPage = null | 'securite' | 'paiement' | 'notifications_settings' | 'support';

const menuItems: { label: string; description: string; icon: typeof Shield; key: SubPage }[] = [
  { label: 'Sécurité', description: 'Mot de passe, 2FA', icon: Shield, key: 'securite' },
  { label: 'Paiement', description: 'Moyens de paiement', icon: CreditCard, key: 'paiement' },
  { label: 'Notifications', description: 'Préférences alertes', icon: Bell, key: 'notifications_settings' },
  { label: 'Support', description: 'Aide et contact', icon: HelpCircle, key: 'support' },
];

export default function Profil() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [subPage, setSubPage] = useState<SubPage>(null);

  if (!user) return null;

  const roleLabel = { admin: 'Administrateur', proprietaire: 'Propriétaire', locataire: 'Locataire' }[user.role];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (subPage === 'securite') return <SecurityPage onBack={() => setSubPage(null)} toast={toast} />;
  if (subPage === 'paiement') return <PaymentMethodsPage onBack={() => setSubPage(null)} toast={toast} />;
  if (subPage === 'notifications_settings') return <NotificationSettingsPage onBack={() => setSubPage(null)} />;
  if (subPage === 'support') return <SupportPage onBack={() => setSubPage(null)} toast={toast} />;

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
      <Card className="border-0 shadow-sm animate-fade-in">
        <CardContent className="p-5 flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl font-extrabold text-primary">
            {user.firstName[0]}{user.name[0]}
          </div>
          <div>
            <p className="text-lg font-extrabold text-foreground">{user.firstName} {user.name}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
            <span className="inline-block mt-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg bg-primary/10 text-primary">{roleLabel}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm animate-slide-up" style={{ animationDelay: '100ms' }}>
        <CardContent className="p-0 divide-y divide-border">
          {menuItems.map(item => (
            <button key={item.label} onClick={() => setSubPage(item.key)}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50 transition-colors active:scale-[0.98]">
              <div className="p-2 rounded-xl bg-muted"><item.icon className="h-4 w-4 text-muted-foreground" /></div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-foreground">{item.label}</p>
                <p className="text-[10px] text-muted-foreground">{item.description}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </CardContent>
      </Card>

      <button onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 py-3 text-destructive text-sm font-semibold hover:bg-destructive/5 rounded-xl transition-colors active:scale-95 animate-slide-up"
        style={{ animationDelay: '200ms' }}>
        <LogOut className="h-4 w-4" />Déconnexion
      </button>
    </div>
  );
}

function SecurityPage({ onBack, toast }: { onBack: () => void; toast: any }) {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-5">
      <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground active:scale-95"><ArrowLeft className="h-4 w-4" /> Profil</button>
      <h1 className="text-xl font-extrabold text-foreground">Sécurité</h1>
      <Card className="border-0 shadow-sm">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-sm font-bold text-foreground">Changer le mot de passe</h3>
          <div>
            <label className="text-xs font-semibold text-foreground mb-1.5 block">Mot de passe actuel</label>
            <div className="relative">
              <Input type={showCurrent ? 'text' : 'password'} placeholder="••••••••" className="rounded-xl pr-10" />
              <button onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">{showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground mb-1.5 block">Nouveau mot de passe</label>
            <div className="relative">
              <Input type={showNew ? 'text' : 'password'} placeholder="••••••••" className="rounded-xl pr-10" />
              <button onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">{showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
            </div>
          </div>
          <Button className="w-full rounded-xl font-semibold active:scale-[0.97]" onClick={() => toast({ title: 'Mot de passe', description: 'Mot de passe modifié avec succès' })}>Mettre à jour</Button>
        </CardContent>
      </Card>
      <Card className="border-0 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10"><Lock className="h-4 w-4 text-primary" /></div>
              <div><p className="text-sm font-bold text-foreground">Authentification 2FA</p><p className="text-[10px] text-muted-foreground">Double vérification par SMS</p></div>
            </div>
            <Switch checked={twoFaEnabled} onCheckedChange={v => { setTwoFaEnabled(v); toast({ title: '2FA', description: v ? '2FA activé' : '2FA désactivé' }); }} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PaymentMethodsPage({ onBack, toast }: { onBack: () => void; toast: any }) {
  const methods = [
    { id: 1, type: 'Carte Visa', last4: '4532', expiry: '12/27', active: true },
    { id: 2, type: 'Mobile Money', number: '+243 812 ***', active: false },
  ];
  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-5">
      <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground active:scale-95"><ArrowLeft className="h-4 w-4" /> Profil</button>
      <h1 className="text-xl font-extrabold text-foreground">Moyens de paiement</h1>
      <div className="space-y-3">
        {methods.map(m => (
          <Card key={m.id} className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10"><CreditCard className="h-4 w-4 text-primary" /></div>
              <div className="flex-1"><p className="text-sm font-bold text-foreground">{m.type}</p><p className="text-[10px] text-muted-foreground">{m.last4 ? `•••• ${m.last4} · Exp. ${m.expiry}` : m.number}</p></div>
              {m.active && <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-accent/10 text-accent">Actif</span>}
            </CardContent>
          </Card>
        ))}
      </div>
      <Button className="w-full rounded-xl font-semibold active:scale-[0.97]" variant="outline" onClick={() => toast({ title: 'Paiement', description: 'Ajout de moyen de paiement simulé' })}>+ Ajouter un moyen de paiement</Button>
    </div>
  );
}

function NotificationSettingsPage({ onBack }: { onBack: () => void }) {
  const [settings, setSettings] = useState({ payments: true, reminders: true, messages: true, contracts: false, marketing: false });
  const toggle = (key: keyof typeof settings) => setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  const items = [
    { key: 'payments' as const, label: 'Paiements', desc: 'Recevoir les confirmations de paiement' },
    { key: 'reminders' as const, label: 'Rappels', desc: 'Rappels d\'échéance de loyer' },
    { key: 'messages' as const, label: 'Messages', desc: 'Notification de nouveaux messages' },
    { key: 'contracts' as const, label: 'Contrats', desc: 'Mises à jour des contrats' },
    { key: 'marketing' as const, label: 'Actualités', desc: 'Offres et nouveautés GestImmo' },
  ];
  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-5">
      <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground active:scale-95"><ArrowLeft className="h-4 w-4" /> Profil</button>
      <h1 className="text-xl font-extrabold text-foreground">Préférences de notifications</h1>
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0 divide-y divide-border">
          {items.map(item => (
            <div key={item.key} className="flex items-center justify-between px-4 py-3.5">
              <div><p className="text-sm font-semibold text-foreground">{item.label}</p><p className="text-[10px] text-muted-foreground">{item.desc}</p></div>
              <Switch checked={settings[item.key]} onCheckedChange={() => toggle(item.key)} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function SupportPage({ onBack, toast }: { onBack: () => void; toast: any }) {
  const [message, setMessage] = useState('');
  const faq = [
    { q: 'Comment modifier mon loyer ?', a: 'Rendez-vous dans Biens > Sélectionnez le bien > Modifiez le montant du loyer.' },
    { q: 'Comment ajouter un locataire ?', a: 'Allez dans Biens > Sélectionnez un bien > Ajoutez un locataire avec ses coordonnées.' },
    { q: 'Comment contacter mon propriétaire ?', a: 'Utilisez la section Messages pour communiquer directement avec votre propriétaire.' },
    { q: 'Comment télécharger un document ?', a: 'Rendez-vous dans Documents, trouvez le fichier et cliquez sur l\'icône de téléchargement.' },
  ];
  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-5">
      <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground active:scale-95"><ArrowLeft className="h-4 w-4" /> Profil</button>
      <h1 className="text-xl font-extrabold text-foreground">Aide et support</h1>
      <div>
        <h2 className="text-sm font-bold text-foreground mb-3">Questions fréquentes</h2>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0 divide-y divide-border">
            {faq.map((item, i) => (
              <details key={i} className="group">
                <summary className="px-4 py-3 text-xs font-semibold text-foreground cursor-pointer hover:bg-muted/50 transition-colors list-none flex items-center justify-between">
                  {item.q}<ChevronRight className="h-3 w-3 text-muted-foreground transition-transform group-open:rotate-90" />
                </summary>
                <p className="px-4 pb-3 text-xs text-muted-foreground">{item.a}</p>
              </details>
            ))}
          </CardContent>
        </Card>
      </div>
      <div>
        <h2 className="text-sm font-bold text-foreground mb-3">Nous contacter</h2>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3"><Mail className="h-4 w-4 text-primary" /><p className="text-xs text-foreground">support@gestimmo.com</p></div>
            <div className="flex items-center gap-3"><Phone className="h-4 w-4 text-primary" /><p className="text-xs text-foreground">+243 999 888 777</p></div>
          </CardContent>
        </Card>
      </div>
      <div>
        <h2 className="text-sm font-bold text-foreground mb-3">Envoyer un message</h2>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 space-y-3">
            <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Décrivez votre problème..."
              className="w-full h-24 px-3 py-2 rounded-xl border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring" />
            <Button className="w-full rounded-xl font-semibold active:scale-[0.97]" disabled={!message.trim()}
              onClick={() => { setMessage(''); toast({ title: 'Message envoyé', description: 'Notre équipe vous répondra sous 24h' }); }}>Envoyer</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
