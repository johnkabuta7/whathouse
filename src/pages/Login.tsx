import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Eye, EyeOff, LogIn, UserPlus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export default function Login() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (mode === 'login') {
      const ok = await login(email, password);
      if (ok) {
        navigate('/');
      } else {
        toast({ title: 'Erreur', description: 'Email ou mot de passe incorrect', variant: 'destructive' });
      }
    } else {
      if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
        toast({ title: 'Erreur', description: 'Tous les champs sont obligatoires', variant: 'destructive' });
        setIsLoading(false);
        return;
      }
      const ok = await signup(email, password, firstName, lastName, phone);
      if (ok) {
        toast({ title: 'Compte créé !', description: 'Vous êtes maintenant connecté.' });
        // Auto-login after signup since auto-confirm is enabled
        await new Promise(r => setTimeout(r, 500));
        const loginOk = await login(email, password);
        if (loginOk) navigate('/');
      } else {
        toast({ title: 'Erreur', description: "Impossible de créer le compte. L'email est peut-être déjà utilisé.", variant: 'destructive' });
      }
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center animate-fade-in">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 mb-4">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-extrabold text-foreground">Groupe Immobilier</h1>
          <p className="text-sm text-muted-foreground mt-1">Publiez & partagez vos annonces</p>
        </div>

        <Card className="border-0 shadow-md animate-slide-up">
          <CardContent className="p-5">
            <div className="flex gap-2 mb-4">
              <Button
                type="button"
                variant={mode === 'login' ? 'default' : 'outline'}
                className="flex-1 rounded-xl text-sm"
                onClick={() => setMode('login')}
              >
                Connexion
              </Button>
              <Button
                type="button"
                variant={mode === 'signup' ? 'default' : 'outline'}
                className="flex-1 rounded-xl text-sm"
                onClick={() => setMode('signup')}
              >
                Inscription
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === 'signup' && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-semibold text-foreground mb-1 block">Prénom</label>
                      <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jean" className="rounded-xl" required />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-foreground mb-1 block">Nom</label>
                      <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Dupont" className="rounded-xl" required />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1 block">Téléphone</label>
                    <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+243 ..." className="rounded-xl" required />
                  </div>
                </>
              )}
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Email</label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="votre@email.com" className="rounded-xl" required />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Mot de passe</label>
                <div className="relative">
                  <Input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="rounded-xl pr-10" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full rounded-xl font-semibold" disabled={isLoading}>
                {mode === 'login' ? <LogIn className="h-4 w-4 mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                {isLoading ? 'Chargement...' : mode === 'login' ? 'Se connecter' : "S'inscrire"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
