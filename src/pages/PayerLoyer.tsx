import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { usePayments, useUpdatePayment } from '@/hooks/use-data';
import { useAuth } from '@/contexts/AuthContext';

export default function PayerLoyer() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: payments } = usePayments();
  const updatePayment = useUpdatePayment();
  const [paymentMode, setPaymentMode] = useState<1 | 2>(1);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  const myPending = payments?.find(p => p.tenant_id === user?.id && p.status === 'pending');
  const totalAmount = myPending ? Number(myPending.total_amount) : 1200;
  const alreadyPaid = myPending ? Number(myPending.amount) : 0;
  const remaining = totalAmount - alreadyPaid;

  const installments = paymentMode === 1
    ? [{ label: 'Aujourd\'hui', amount: remaining }]
    : [{ label: 'Aujourd\'hui', amount: remaining / 2 }, { label: 'Dans 30 jours', amount: remaining / 2 }];

  const handlePay = async () => {
    setProcessing(true);
    if (myPending) {
      const newAmount = paymentMode === 1 ? totalAmount : alreadyPaid + remaining / 2;
      const newStatus = newAmount >= totalAmount ? 'paid' : 'pending';
      await updatePayment.mutateAsync({
        id: myPending.id,
        amount: newAmount,
        status: newStatus,
        payment_date: new Date().toISOString().split('T')[0],
      });
    }
    setTimeout(() => {
      setProcessing(false);
      setSuccess(true);
    }, 1500);
  };

  if (success) {
    return (
      <div className="px-4 py-6 max-w-lg mx-auto flex flex-col items-center justify-center min-h-[60vh] space-y-6 animate-fade-in">
        <div className="h-20 w-20 rounded-full bg-accent/10 flex items-center justify-center">
          <CheckCircle2 className="h-10 w-10 text-accent" />
        </div>
        <div className="text-center">
          <p className="text-xl font-extrabold text-foreground">Paiement réussi !</p>
          <p className="text-sm text-muted-foreground mt-2">
            {paymentMode === 1 ? `${remaining}€` : `${remaining / 2}€`} ont été débités avec succès.
          </p>
        </div>
        <Button className="rounded-xl font-semibold w-full max-w-xs active:scale-[0.97]" onClick={() => navigate('/paiements')}>
          Retour aux paiements
        </Button>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-5">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground active:scale-95">
        <ArrowLeft className="h-4 w-4" /> Retour
      </button>

      <Card className="border-0 shadow-sm animate-fade-in">
        <CardContent className="p-5 text-center">
          <p className="text-xs text-muted-foreground mb-1">Montant restant à payer</p>
          <p className="text-4xl font-extrabold text-foreground">{remaining}€</p>
          <p className="text-xs text-muted-foreground mt-1">Loyer total : {totalAmount}€ · Déjà payé : {alreadyPaid}€</p>
          <Progress value={(alreadyPaid / totalAmount) * 100} className="h-2 mt-4" />
        </CardContent>
      </Card>

      <div className="animate-slide-up" style={{ animationDelay: '100ms' }}>
        <h2 className="text-sm font-bold text-foreground mb-3">Mode de paiement</h2>
        <div className="grid grid-cols-2 gap-3">
          {([1, 2] as const).map(mode => (
            <button key={mode} onClick={() => setPaymentMode(mode)}
              className={cn('p-4 rounded-2xl border-2 transition-all text-center active:scale-[0.97]',
                paymentMode === mode ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/30'
              )}>
              <p className="text-lg font-extrabold text-foreground">{mode}x</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{mode === 1 ? 'Paiement unique' : 'En 2 fois'}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="animate-slide-up" style={{ animationDelay: '200ms' }}>
        <h2 className="text-sm font-bold text-foreground mb-3">Détail des échéances</h2>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0 divide-y divide-border">
            {installments.map((inst, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className={cn('h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold',
                    i === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  )}>{i + 1}</div>
                  <p className="text-xs font-semibold text-foreground">{inst.label}</p>
                </div>
                <p className="text-sm font-extrabold text-foreground">{inst.amount}€</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2 px-3 py-2.5 bg-accent/5 rounded-xl animate-slide-up" style={{ animationDelay: '300ms' }}>
        <Lock className="h-4 w-4 text-accent shrink-0" />
        <p className="text-[11px] text-muted-foreground">Paiement sécurisé via notre plateforme. Vos données sont protégées.</p>
      </div>

      <Button className="w-full rounded-xl font-bold text-base h-12 active:scale-[0.97] animate-slide-up" style={{ animationDelay: '400ms' }}
        onClick={handlePay} disabled={processing || remaining <= 0}>
        {processing ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            Traitement...
          </span>
        ) : remaining <= 0 ? 'Tout est payé ✅' : `Payer ${installments[0].amount}€ maintenant`}
      </Button>
    </div>
  );
}
