import { useState, useEffect, useRef } from 'react';
import { X, Loader2, Smartphone, Search, UserPlus, Check, GripHorizontal } from 'lucide-react';
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

export function ImportContactsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [phoneBookPhones, setPhoneBookPhones] = useState<Set<string>>(new Set());
  const [existingPhones, setExistingPhones] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState<string | null>(null);

  // Draggable
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      const [{ data: profs }, { data: imps }] = await Promise.all([
        supabase.from('profiles').select('user_id, first_name, last_name, phone, avatar_url').neq('user_id', user.id),
        supabase.from('imported_contacts').select('contact_phone, status').eq('user_id', user.id),
      ]);
      setAllProfiles((profs || []).filter((p: any) => p.phone));
      const all = new Set<string>();
      (imps || []).forEach((i: any) => all.add(normalizePhone(i.contact_phone)));
      setPhoneBookPhones(all);
      setExistingPhones(all);
    })();
  }, [open, user]);

  if (!open) return null;

  const close = () => { setSearch(''); setPos({ x: 0, y: 0 }); onClose(); };

  const q = normalizeSearch(search);
  // Sort: phone-book contacts first, then DB-only
  const sortedProfiles = [...allProfiles].sort((a, b) => {
    const ap = phoneBookPhones.has(normalizePhone(a.phone)) ? 0 : 1;
    const bp = phoneBookPhones.has(normalizePhone(b.phone)) ? 0 : 1;
    return ap - bp;
  });
  const results = q
    ? sortedProfiles.filter(p =>
        normalizeSearch(`${p.first_name} ${p.last_name}`).includes(q) ||
        normalizeSearch(p.phone || '').includes(q)
      ).slice(0, 30)
    : sortedProfiles.slice(0, 30);

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
    toast({ title: `${name || 'Contact'} ajouté` });
    qc.invalidateQueries({ queryKey: ['repertoire'] });
  };

  const autoImport = async (contacts: PhoneContact[]) => {
    if (!user) return;
    const cleaned = contacts
      .map(c => ({ name: (c.name || '').trim(), phone: normalizePhone(c.phone) }))
      .filter(c => c.phone && c.phone.length >= 7);
    if (cleaned.length === 0) { toast({ title: 'Aucun numéro détecté', variant: 'destructive' }); return; }

    const phones = Array.from(new Set(cleaned.map(c => c.phone)));
    const { data: profiles } = await supabase.from('profiles').select('user_id, first_name, last_name, phone').in('phone', phones);
    const byPhone = new Map<string, any>();
    (profiles || []).forEach((p: any) => p.phone && byPhone.set(normalizePhone(p.phone), p));

    const rows: any[] = [];
    const invites: PhoneContact[] = [];
    const seen = new Set<string>();
    for (const c of cleaned) {
      if (seen.has(c.phone)) continue;
      seen.add(c.phone);
      const prof = byPhone.get(c.phone);
      if (prof && prof.user_id === user.id) continue;
      const displayName = c.name || (prof ? `${prof.first_name || ''} ${prof.last_name || ''}`.trim() : '') || c.phone;
      rows.push({
        user_id: user.id,
        contact_phone: c.phone,
        contact_name: displayName,
        status: prof ? 'confirmed' : 'pending',
      });
      if (!prof) invites.push({ name: displayName, phone: c.phone });
    }

    if (rows.length === 0) { toast({ title: 'Aucun contact à importer' }); close(); return; }
    const { error } = await supabase.from('imported_contacts').upsert(rows as any, { onConflict: 'user_id,contact_phone' });
    if (error) { toast({ title: 'Erreur', description: error.message, variant: 'destructive' }); return; }

    const onApp = rows.length - invites.length;
    toast({
      title: `${rows.length} contact(s) importé(s)`,
      description: invites.length > 0
        ? `${onApp} sur WhatHouse · ${invites.length} invitation(s) WhatsApp`
        : `${onApp} sur WhatHouse`,
    });
    qc.invalidateQueries({ queryKey: ['repertoire'] });

    if (invites.length > 0) {
      const origin = window.location.origin;
      const invitedKey = 'wh_invited_phones';
      let already: string[] = [];
      try { already = JSON.parse(localStorage.getItem(invitedKey) || '[]'); } catch {}
      const toInvite = invites.filter(i => !already.includes(i.phone));
      toInvite.forEach((inv, i) => {
        const msg = `Bonjour ${inv.name || ''}, je vous invite à rejoindre WhatHouse — la plateforme des pros de l'immobilier. Inscrivez-vous ici : ${origin}/login`;
        const phoneDigits = inv.phone.replace(/[^0-9]/g, '');
        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        const url = isMobile
          ? `whatsapp://send?phone=${phoneDigits}&text=${encodeURIComponent(msg)}`
          : `https://wa.me/${phoneDigits}?text=${encodeURIComponent(msg)}`;
        setTimeout(() => {
          if (isMobile) window.location.href = url;
          else window.open(url, '_blank', 'noopener,noreferrer');
        }, i * 800);
      });
      try { localStorage.setItem(invitedKey, JSON.stringify([...already, ...toInvite.map(i => i.phone)])); } catch {}
    }
    close();
  };

  const pickFromDevice = async () => {
    const nav: any = navigator;
    if (!nav.contacts || !nav.contacts.select) {
      // Info non-bloquante dans le modal, pas de toast rouge plein écran
      toast({
        title: 'Import auto indisponible sur ce navigateur',
        description: "Ajoutez vos contacts un par un depuis la liste ci-dessous, ou ouvrez l'app depuis Chrome Android.",
      });
      return;
    }
    setLoading(true);
    try {
      let result: any[];
      try {
        result = await nav.contacts.select(['name', 'tel', 'icon'], { multiple: true });
      } catch {
        result = await nav.contacts.select(['name', 'tel'], { multiple: true });
      }
      const contacts: PhoneContact[] = [];
      for (const c of result) {
        const name = (c.name && c.name[0]) || '';
        for (const tel of (c.tel || [])) contacts.push({ name, phone: tel });
      }
      await autoImport(contacts);
    } catch { toast({ title: 'Accès refusé', variant: 'destructive' }); }
    finally { setLoading(false); }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    setPos({ x: dragRef.current.ox + e.clientX - dragRef.current.sx, y: dragRef.current.oy + e.clientY - dragRef.current.sy });
  };
  const onPointerUp = () => { dragRef.current = null; };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 animate-fade-in" onClick={close}>
      <div
        className="bg-card w-full max-w-xs rounded-2xl shadow-2xl border border-border/50 backdrop-blur-xl"
        style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
        onClick={e => e.stopPropagation()}
      >
        <header
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="flex items-center justify-between px-4 py-2.5 border-b border-border cursor-grab active:cursor-grabbing select-none touch-none"
        >
          <div className="flex items-center gap-2 flex-1">
            <GripHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            <h2 className="text-sm font-bold text-foreground">Importer des contacts</h2>
          </div>
          <button onClick={close} className="p-1 rounded-full hover:bg-muted"><X className="h-4 w-4" /></button>
        </header>

        <div className="p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="w-full pl-8 pr-3 py-2 rounded-full bg-muted text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <Button onClick={pickFromDevice} disabled={loading} className="w-full h-11 rounded-xl bg-primary text-primary-foreground gap-2 text-sm">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
            Importer depuis le téléphone
          </Button>

          <div className="max-h-72 overflow-y-auto -mx-1 px-1 space-y-1">
            {results.length === 0 ? (
              <p className="text-[11px] text-center text-muted-foreground py-4">Aucun contact</p>
            ) : results.map(p => {
              const name = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Contact';
              const phone = normalizePhone(p.phone);
              const already = existingPhones.has(phone);
              const fromPhone = phoneBookPhones.has(phone);
              return (
                <div key={p.user_id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted">
                  <div className="h-9 w-9 rounded-full bg-white overflow-hidden shrink-0">
                    <img src={p.avatar_url || '/whathouse-icon.png'} className="h-full w-full object-cover" alt="" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {fromPhone ? '📱 Répertoire' : '🌐 WhatHouse'}
                    </p>
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
        </div>
      </div>
    </div>
  );
}
