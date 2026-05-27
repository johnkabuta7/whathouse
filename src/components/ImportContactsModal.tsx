import { useState, useEffect } from 'react';
import { X, Loader2, Smartphone, Keyboard, Search, UserPlus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { normalizeSearch } from '@/hooks/use-data';

type PhoneContact = { name: string; phone: string };

function normalizePhone(p: string): string {
  if (!p) return '';
  const digits = p.replace(/[^0-9+]/g, '');
  if (digits.startsWith('+')) return '+' + digits.slice(1).replace(/[^0-9]/g, '');
  return digits.replace(/^00/, '+');
}

const PERMISSION_KEY = 'wh_contacts_permission_granted';

export function ImportContactsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'choice' | 'manual'>('choice');
  const [manualText, setManualText] = useState('');
  const [search, setSearch] = useState('');
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [existingPhones, setExistingPhones] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      const [{ data: profs }, { data: imps }] = await Promise.all([
        supabase.from('profiles').select('user_id, first_name, last_name, phone, avatar_url').neq('user_id', user.id),
        supabase.from('imported_contacts').select('contact_phone').eq('user_id', user.id),
      ]);
      setAllProfiles((profs || []).filter((p: any) => p.phone));
      setExistingPhones(new Set((imps || []).map((i: any) => normalizePhone(i.contact_phone))));
    })();
  }, [open, user]);

  if (!open) return null;

  const close = () => { setStep('choice'); setManualText(''); setSearch(''); onClose(); };

  const q = normalizeSearch(search);
  const results = q
    ? allProfiles.filter(p =>
        normalizeSearch(`${p.first_name} ${p.last_name}`).includes(q) ||
        normalizeSearch(p.phone || '').includes(q)
      ).slice(0, 20)
    : [];

  const addOne = async (p: any) => {
    if (!user) return;
    setAdding(p.user_id);
    const phone = normalizePhone(p.phone);
    const name = `${p.first_name || ''} ${p.last_name || ''}`.trim();
    const { error } = await supabase.from('imported_contacts').upsert(
      { user_id: user.id, contact_phone: phone, contact_name: name, status: 'confirmed' },
      { onConflict: 'user_id,contact_phone' }
    );
    setAdding(null);
    if (error) { toast({ title: 'Erreur', description: error.message, variant: 'destructive' }); return; }
    setExistingPhones(prev => new Set(prev).add(phone));
    toast({ title: `${name || phone} ajouté` });
    qc.invalidateQueries({ queryKey: ['repertoire'] });
  };

  const autoImport = async (contacts: PhoneContact[]) => {
    if (!user) return;
    const phones = Array.from(new Set(contacts.map(c => normalizePhone(c.phone)).filter(Boolean)));
    if (phones.length === 0) { toast({ title: 'Aucun numéro détecté', variant: 'destructive' }); return; }
    const { data: profiles } = await supabase.from('profiles').select('*').in('phone', phones);
    const byPhone = new Map<string, any>();
    (profiles || []).forEach((p: any) => p.phone && byPhone.set(normalizePhone(p.phone), p));
    const rows = contacts
      .map(c => ({ ...c, phone: normalizePhone(c.phone) }))
      .filter(c => c.phone && byPhone.has(c.phone) && byPhone.get(c.phone).user_id !== user.id)
      .map(c => ({
        user_id: user.id,
        contact_phone: c.phone,
        contact_name: c.name || `${byPhone.get(c.phone).first_name || ''} ${byPhone.get(c.phone).last_name || ''}`.trim(),
        status: 'confirmed',
      }));
    const seen = new Set<string>();
    const unique = rows.filter(r => seen.has(r.contact_phone) ? false : (seen.add(r.contact_phone), true));
    if (unique.length === 0) { toast({ title: "Aucun de vos contacts n'est sur WhatHouse" }); close(); return; }
    const { error } = await supabase.from('imported_contacts').upsert(unique as any, { onConflict: 'user_id,contact_phone' });
    if (error) { toast({ title: 'Erreur', description: error.message, variant: 'destructive' }); return; }
    toast({ title: `${unique.length} contact(s) ajouté(s)` });
    qc.invalidateQueries({ queryKey: ['repertoire'] });
    close();
  };

  const pickFromDevice = async () => {
    const nav: any = navigator;
    if (!nav.contacts || !nav.contacts.select) { setStep('manual'); return; }
    setLoading(true);
    try {
      const result = await nav.contacts.select(['name', 'tel'], { multiple: true });
      try { localStorage.setItem(PERMISSION_KEY, '1'); } catch {}
      const contacts: PhoneContact[] = [];
      for (const c of result) {
        const name = (c.name && c.name[0]) || '';
        for (const tel of (c.tel || [])) contacts.push({ name, phone: tel });
      }
      await autoImport(contacts);
    } catch { toast({ title: 'Accès refusé', variant: 'destructive' }); }
    finally { setLoading(false); }
  };

  const parseManual = async () => {
    setLoading(true);
    try {
      const lines = manualText.split(/[\n,;]+/).map(l => l.trim()).filter(Boolean);
      const contacts: PhoneContact[] = lines.map(l => {
        const m = l.match(/(.*?)\s*[:\-]?\s*(\+?\d[\d\s().-]{5,})/);
        if (m) return { name: m[1].trim(), phone: m[2] };
        return { name: '', phone: l };
      });
      await autoImport(contacts);
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 animate-fade-in" onClick={close}>
      <div className="bg-card w-full max-w-xs rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <header className="flex items-center justify-between px-4 py-2.5 border-b border-border">
          <h2 className="text-sm font-bold text-foreground">Importer des contacts</h2>
          <button onClick={close} className="p-1 rounded-full hover:bg-muted"><X className="h-4 w-4" /></button>
        </header>
        {step === 'choice' && (
          <div className="p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher nom ou numéro..."
                className="w-full pl-8 pr-3 py-2 rounded-full bg-muted text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            {q && (
              <div className="max-h-56 overflow-y-auto -mx-1 px-1 space-y-1">
                {results.length === 0 ? (
                  <p className="text-[11px] text-center text-muted-foreground py-3">Aucun résultat</p>
                ) : results.map(p => {
                  const name = `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.phone;
                  const phone = normalizePhone(p.phone);
                  const already = existingPhones.has(phone);
                  return (
                    <div key={p.user_id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted">
                      <div className="h-8 w-8 rounded-full bg-white overflow-hidden shrink-0">
                        <img src={p.avatar_url || '/whathouse-icon.png'} className="h-full w-full object-cover" alt="" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{p.phone}</p>
                      </div>
                      {already ? (
                        <span className="text-[10px] text-success inline-flex items-center gap-0.5"><Check className="h-3 w-3" />Ajouté</span>
                      ) : (
                        <button onClick={() => addOne(p)} disabled={adding === p.user_id}
                          className="h-7 w-7 rounded-full bg-primary text-primary-foreground inline-flex items-center justify-center">
                          {adding === p.user_id ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {!q && (
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={pickFromDevice} disabled={loading} className="h-20 rounded-xl bg-primary text-primary-foreground flex flex-col gap-1 text-xs">
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Smartphone className="h-5 w-5" />}
                  Import tél.
                </Button>
                <Button onClick={() => setStep('manual')} variant="outline" className="h-20 rounded-xl flex flex-col gap-1 text-xs">
                  <Keyboard className="h-5 w-5" />
                  Saisie man.
                </Button>
              </div>
            )}
          </div>
        )}
        {step === 'manual' && (
          <div className="p-4 space-y-2">
            <textarea
              value={manualText}
              onChange={e => setManualText(e.target.value)}
              rows={6}
              placeholder={'Jean: +243...\n+33...'}
              className="w-full px-3 py-2 rounded-xl bg-muted text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('choice')} className="rounded-full text-xs h-9">Retour</Button>
              <Button onClick={parseManual} disabled={loading || !manualText.trim()} className="flex-1 rounded-full bg-primary text-primary-foreground text-xs h-9">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Importer'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
