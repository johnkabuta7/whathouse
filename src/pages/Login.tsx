import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Eye, EyeOff, LogIn } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth, AppRole } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const testAccounts = [
  { email: 'admin@gestimmo.com', password: 'admin123', firstName: 'Aminata', lastName: 'Diallo', role: 'admin' as AppRole, label: 'Administrateur' },
  { email: 'patrick@gestimmo.com', password: 'proprio123', firstName: 'Patrick', lastName: 'Kabila', role: 'proprietaire' as AppRole, label: 'Propriétaire' },
  { email: 'jean@gestimmo.com', password: 'locataire123', firstName: 'Jean', lastName: 'Mutombo', role: 'locataire' as AppRole, label: 'Locataire' },
];

const roleColors: Record<string, string> = {
  admin: 'bg-destructive/10 text-destructive border-destructive/20',
  proprietaire: 'bg-primary/10 text-primary border-primary/20',
  locataire: 'bg-accent/10 text-accent border-accent/20',
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    const success = await login(email, password);
    if (success) {
      navigate('/');
    } else {
      setError('Email ou mot de passe incorrect');
    }
    setIsLoading(false);
  };

  const quickLogin = async (account: typeof testAccounts[0]) => {
    setIsLoading(true);
    setError('');
    // Try login first, if fails, create account
    let success = await login(account.email, account.password);
    if (!success) {
      const created = await signup(account.email, account.password, account.firstName, account.lastName, account.role);
      if (created) {
        // Wait a moment for the trigger to create profile/role
        await new Promise(r => setTimeout(r, 500));
        success = await login(account.email, account.password);
      }
      if (!success) {
        toast({ title: 'Erreur', description: 'Impossible de créer le compte de test', variant: 'destructive' });
        setIsLoading(false);
        return;
      }
    }
    navigate('/');
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center animate-fade-in">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 mb-4">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-extrabold text-foreground">GestImmo</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestion locative intelligente</p>
        </div>

        <Card className="border-0 shadow-md animate-slide-up">
          <CardContent className="p-5">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">Email</label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="votre@email.com" className="rounded-xl" required />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">Mot de passe</label>
                <div className="relative">
                  <Input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="rounded-xl pr-10" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {error && <p className="text-xs text-destructive font-medium bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}
              <Button type="submit" className="w-full rounded-xl font-semibold active:scale-[0.97]" disabled={isLoading}>
                <LogIn className="h-4 w-4 mr-2" />
                {isLoading ? 'Connexion...' : 'Se connecter'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="animate-slide-up" style={{ animationDelay: '150ms' }}>
          <p className="text-xs font-semibold text-muted-foreground text-center mb-3">Comptes de test</p>
          <div className="space-y-2">
            {testAccounts.map(a => (
              <button
                key={a.email}
                onClick={() => quickLogin(a)}
                disabled={isLoading}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all hover:shadow-sm active:scale-[0.97] disabled:opacity-50 ${roleColors[a.role]}`}
              >
                <div className="h-9 w-9 rounded-full bg-current/10 flex items-center justify-center text-sm font-bold opacity-80">
                  {a.firstName[0]}{a.lastName[0]}
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm font-bold">{a.firstName} {a.lastName}</p>
                  <p className="text-[10px] opacity-70">{a.email}</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-current/10">{a.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
