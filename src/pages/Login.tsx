import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, LogIn, UserPlus, Phone, ArrowLeft, Mail, Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

type Mode = 'login_phone' | 'login_email' | 'signup';

export default function Login() {
  const [mode, setMode] = useState<Mode>('login_phone');
  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { loginWithPhone, loginWithEmail, signup } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (mode === 'login_phone') {
      const trimmed = phone.trim();
      if (!/^\+\d{6,15}$/.test(trimmed)) {
        toast({ title: 'Numéro invalide', description: 'Le numéro doit commencer par le préfixe du pays (ex: +243, +33, +1...)', variant: 'destructive' });
        setIsLoading(false);
        return;
      }
      const ok = await loginWithPhone(phone);
      if (ok) { navigate('/', { replace: true }); return; }
      toast({ title: 'Erreur', description: 'Numéro non reconnu ou compte inexistant', variant: 'destructive' });
    } else if (mode === 'login_email') {
      if (!email.trim() || !password) {
        toast({ title: 'Champs manquants', description: 'Email et mot de passe requis', variant: 'destructive' });
        setIsLoading(false);
        return;
      }
      const ok = await loginWithEmail(email, password);
      if (ok) { navigate('/', { replace: true }); return; }
      toast({
        title: 'Connexion impossible',
        description: 'Email ou mot de passe incorrect. Si vous avez un compte zwandako.com, vérifiez vos identifiants.',
        variant: 'destructive',
      });
    } else {
      // signup
      const trimmed = phone.trim();
      if (!/^\+\d{6,15}$/.test(trimmed)) {
        toast({ title: 'Numéro invalide', description: 'Commencez par le préfixe pays (+243, +33...)', variant: 'destructive' });
        setIsLoading(false);
        return;
      }
      if (!firstName.trim() || !lastName.trim()) {
        toast({ title: 'Erreur', description: 'Tous les champs sont obligatoires', variant: 'destructive' });
        setIsLoading(false);
        return;
      }
      const result = await signup(phone, firstName, lastName, email, password);
      if (result.ok) {
        toast({ title: 'Compte créé !', description: 'Bienvenue sur WhatHouse' });
        navigate('/', { replace: true });
        return;
      }
      if (result.reason === 'duplicate') {
        toast({ title: 'Numéro déjà inscrit', description: 'Un compte existe déjà. Veuillez vous connecter.', variant: 'destructive' });
        setMode('login_phone');
      } else {
        toast({ title: 'Erreur', description: 'Impossible de créer le compte. Réessayez.', variant: 'destructive' });
      }
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-8 relative">
      <button
        type="button"
        onClick={() => navigate('/onboarding')}
        className="absolute top-4 left-4 h-10 w-10 rounded-full bg-muted flex items-center justify-center text-foreground hover:bg-muted/80 transition-colors"
        aria-label="Retour à la présentation"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center animate-fade-in">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 mb-4">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-extrabold text-foreground">WhatHouse</h1>
          <p className="text-sm text-muted-foreground mt-1">Pro Immobilier</p>
        </div>

        <Card className="border-0 shadow-md animate-slide-up">
          <CardContent className="p-5">
            {/* Tabs */}
            <div className="flex border-b border-border mb-4">
              <button
                type="button"
                onClick={() => setMode('login_phone')}
                className={`flex-1 py-2.5 text-[11px] font-semibold text-center transition-colors ${mode === 'login_phone' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}
              >
                Téléphone
              </button>
              <button
                type="button"
                onClick={() => setMode('login_email')}
                className={`flex-1 py-2.5 text-[11px] font-semibold text-center transition-colors ${mode === 'login_email' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}
              >
                Email
              </button>
              <button
                type="button"
                onClick={() => setMode('signup')}
                className={`flex-1 py-2.5 text-[11px] font-semibold text-center transition-colors ${mode === 'signup' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}
              >
                Inscription
              </button>
            </div>

            {mode === 'login_email' && (
              <p className="text-[11px] text-muted-foreground mb-3 leading-tight">
                Connectez-vous avec votre email et mot de passe <span className="font-semibold text-primary">zwandako.com</span> ou WhatHouse — vos publications iront dans votre compte existant.
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === 'login_email' ? (
                <>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="vous@exemple.com" className="rounded-xl pl-10" autoComplete="email" required />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mot de passe" className="rounded-xl pl-10" autoComplete="current-password" required />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1 block">Numéro de téléphone *</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="+243 XXXXXXXXX"
                        className="rounded-xl pl-10"
                        required
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">⚠️ Commencez par le <span className="font-semibold text-primary">préfixe pays</span> (ex: +243, +33, +1, +32...)</p>
                  </div>
                  {mode === 'signup' && (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs font-semibold text-foreground mb-1 block">Prénom *</label>
                          <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jean" className="rounded-xl" required />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-foreground mb-1 block">Nom *</label>
                          <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Dupont" className="rounded-xl" required />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-foreground mb-1 block">Adresse e-mail (optionnel)</label>
                        <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="vous@exemple.com" className="rounded-xl" autoComplete="email" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-foreground mb-1 block">Mot de passe (optionnel)</label>
                        <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="6 caractères minimum" className="rounded-xl" autoComplete="new-password" />
                        <p className="text-[10px] text-muted-foreground mt-1">Sert à se connecter avec email/mot de passe et créer votre compte zwandako.com automatiquement.</p>
                      </div>
                    </>
                  )}
                </>
              )}
              <Button type="submit" className="w-full rounded-xl font-semibold" disabled={isLoading}>
                {mode === 'signup' ? <UserPlus className="h-4 w-4 mr-2" /> : <LogIn className="h-4 w-4 mr-2" />}
                {isLoading ? 'Chargement...' : mode === 'signup' ? "S'inscrire" : 'Se connecter'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
