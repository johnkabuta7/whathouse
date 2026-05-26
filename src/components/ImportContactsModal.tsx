import { useState } from 'react';
import { X, Search, Loader2, UserPlus, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

type PhoneContact = { name: string; phone: string };
type Matched = PhoneContact & { profile: any };

function normalizePhone(p: string): string {
  if (!p) return '';
  const digits = p.replace(/[^0-9+]/g, '');
  if (digits.startsWith('+')) return '+' + digits.slice(1).replace(/[^0-9]/g, '');
  return digits.replace(/^00/, '+');
}

export function ImportContactsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [step, setStep] = useState<'intro' | 'matched' | 'manual'>('intro');
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<Matched[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [manualText, setManualText] = useState('');
  const [search, setSearch] = useState('');

  if (!open) return null;

  const reset = () => { setStep('intro'); setMatches([]); setSelected(new Set()); setManualText(''); setSearch(''); };
  const close = () => { reset(); onClose(); };

  const matchContacts = async (contacts: PhoneContact[]) => {
    setLoading(true);
    try {
      const phones = Array.from(new Set(contacts.map(c => normalizePhone(c.phone)).filter(Boolean)));
      if (phones.length === 0) {
        toast({ title: 'Aucun numéro détecté', description: 'Vos contacts n\'ont pas de numéro.', variant: 'destructive' });
        return;
      }
      const { data: profiles } = await supabase.from('profiles').select('*').in('phone', phones);
      const byPhone = new Map<string, any>();
      (profiles || []).forEach((p: any) => p.phone && byPhone.set(normalizePhone(p.phone), p));
      const matched: Matched[] = contacts
        .map(c => ({ ...c, phone: normalizePhone(c.phone) }))
        .filter(c => c.phone && byPhone.has(c.phone) && byPhone.get(c.phone).user_id !== user?.id)
        .map(c => ({ ...c, profile: byPhone.get(c.phone) }));
      // dedupe by phone
      const seen = new Set<string>();
      const unique = matched.filter(m => (seen.has(m.phone) ? false : (seen.add(m.phone), true)));
      setMatches(unique);
      setSelected(new Set(unique.map(m => m.phone)));
      setStep('matched');
      if (unique.length === 0) {
        toast({ title: 'Aucun de vos contacts n\'est sur WhatHouse', description: 'Invitez-les à rejoindre l\'app.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const pickFromDevice = async () => {
    const nav: any = navigator;
    if (!nav.contacts || !nav.contacts.select) {
      setStep('manual');
      return;
    }
    try {
      const props = ['name', 'tel'];
      const opts = { multiple: true };
      const result = await nav.contacts.select(props, opts);
      const contacts: PhoneContact[] = [];
      for (const c of result) {
        const name = (c.name && c.name[0]) || '';
        for (const tel of (c.tel || [])) {
          contacts.push({ name, phone: tel });
        }
      }
      await matchContacts(contacts);
    } catch (e: any) {
      toast({ title: 'Accès refusé', description: 'Impossible d\'accéder aux contacts.', variant: 'destructive' });
    }
  };

  const parseManual = async () => {
    const lines = manualText.split(/[\n,;]+/).map(l => l.trim()).filter(Boolean);
    const contacts: PhoneContact[] = lines.map(l => {
      // accept "Nom: +123" or "+123" or "Nom +123"
      const m = l.match(/(.*?)\s*[:\-]?\s*(\+?\d[\d\s().-]{5,})/);
      if (m) return { name: m[1].trim(), phone: m[2] };
      return { name: '', phone: l };
    });
    await matchContacts(contacts);
  };

  const toggle = (phone: string) => {
    setSelected(s => {
      const n = new Set(s);
      n.has(phone) ? n.delete(phone) : n.add(phone);
      return n;
    });
  };

  const doImport = async () => {
    if (!user || selected.size === 0) return;
    setLoading(true);
    try {
      const rows = matches
        .filter(m => selected.has(m.phone))
        .map(m => ({
          user_id: user.id,
          contact_phone: m.phone,
          contact_name: m.name || `${m.profile.first_name || ''} ${m.profile.last_name || ''}`.trim(),
          status: 'confirmed',
        }));
      const { error } = await supabase.from('imported_contacts').upsert(rows as any, { onConflict: 'user_id,contact_phone' });
      if (error) throw error;
      toast({ title: 'Contacts importés', description: `${rows.length} contact(s) ajouté(s).` });
      qc.invalidateQueries({ queryKey: ['imported_contacts'] });
      qc.invalidateQueries({ queryKey: ['repertoire'] });
      close();
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const filtered = matches.filter(m => {
    if (!search) return true;
    const q = search.toLowerCase();
    return m.name.toLowerCase().includes(q) || m.phone.includes(q) ||
      `${m.profile.first_name} ${m.profile.last_name}`.toLowerCase().includes(q);
  });

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in" onClick={close}>
      <div className="bg-card w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-base font-bold text-foreground">Importer des contacts</h2>
          <button onClick={close} className="p-1.5 rounded-full hover:bg-muted"><X className="h-5 w-5" /></button>
        </header>

        {step === 'intro' && (
          <div className="p-5 space-y-3">
            <p className="text-sm text-muted-foreground">Seuls vos contacts <span className="font-semibold text-foreground">qui possèdent un compte WhatHouse</span> apparaîtront.</p>
            <Button onClick={pickFromDevice} disabled={loading} className="w-full h-12 rounded-full bg-primary text-primary-foreground">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
              Autoriser & importer depuis le téléphone
            </Button>
            <button onClick={() => setStep('manual')} className="w-full text-xs text-primary font-semibold py-2">
              Mon navigateur ne supporte pas → saisir manuellement
            </button>
          </div>
        )}

        {step === 'manual' && (
          <div className="p-5 space-y-3 flex-1 overflow-y-auto">
            <p className="text-xs text-muted-foreground">Collez vos numéros (un par ligne, format international +243...).</p>
            <textarea
              value={manualText}
              onChange={e => setManualText(e.target.value)}
              rows={8}
              placeholder={'Jean: +243812345678\n+33612345678'}
              className="w-full px-3 py-2 rounded-xl bg-muted text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <Button onClick={parseManual} disabled={loading || !manualText.trim()} className="w-full h-11 rounded-full bg-primary text-primary-foreground">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Rechercher'}
            </Button>
          </div>
        )}

        {step === 'matched' && (
          <>
            <div className="px-4 pt-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
                  className="w-full pl-9 pr-4 py-2 rounded-full bg-muted text-sm focus:outline-none" />
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                {matches.length} contact(s) trouvé(s) sur WhatHouse · {selected.size} sélectionné(s)
              </p>
            </div>
            <div className="flex-1 overflow-y-auto px-2 py-2">
              {filtered.length === 0 && (
                <p className="text-center text-xs text-muted-foreground py-10">Aucun résultat.</p>
              )}
              {filtered.map(m => {
                const isSel = selected.has(m.phone);
                const p = m.profile;
                const name = `${p.first_name || ''} ${p.last_name || ''}`.trim() || m.name || 'Contact';
                const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2);
                return (
                  <button key={m.phone} onClick={() => toggle(m.phone)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left ${isSel ? 'bg-primary/10' : 'hover:bg-muted'}`}>
                    <Checkbox checked={isSel} className="pointer-events-none" />
                    <div className="h-10 w-10 rounded-full bg-primary/15 text-primary font-bold text-sm flex items-center justify-center overflow-hidden shrink-0">
                      {p.avatar_url ? <img src={p.avatar_url} className="h-full w-full object-cover" /> : initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{m.phone}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            <footer className="p-3 border-t border-border flex gap-2">
              <Button variant="outline" onClick={() => setStep('intro')} className="rounded-full">Retour</Button>
              <Button onClick={doImport} disabled={loading || selected.size === 0}
                className="flex-1 rounded-full bg-primary text-primary-foreground">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                Importer ({selected.size})
              </Button>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
