import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, Users, FileText, TrendingUp, Loader2, Database, Crown, Shield, User as UserIcon, Sparkles, Trash2, Star, LogIn } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useIsAppAdmin, useDeleteGroup } from '@/hooks/use-data';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

type AccountType = 'agent' | 'agent_premium' | 'admin';

const TYPE_META: Record<AccountType, { label: string; cls: string; icon: any }> = {
  agent:         { label: 'Agent',         cls: 'bg-blue-500/15 text-blue-500 border-blue-500/30',         icon: UserIcon },
  agent_premium: { label: 'Agent Premium', cls: 'bg-amber-500/15 text-amber-500 border-amber-500/30',       icon: Crown },
  admin:         { label: 'Admin',         cls: 'bg-rose-500/15 text-rose-500 border-rose-500/30',          icon: Shield },
};



function startOf(period: 'day' | 'week' | 'month'): string {
  const d = new Date();
  if (period === 'day') { d.setHours(0,0,0,0); }
  else if (period === 'week') { const day = (d.getDay() + 6) % 7; d.setDate(d.getDate() - day); d.setHours(0,0,0,0); }
  else { d.setDate(1); d.setHours(0,0,0,0); }
  return d.toISOString();
}

async function countSince(table: string, since: string | null) {
  let q = supabase.from(table as any).select('*', { count: 'exact', head: true });
  if (since) q = q.gte('created_at', since);
  const { count } = await q;
  return count || 0;
}

function StatCard({ icon: Icon, label, value, color = 'primary' }: any) {
  return (
    <div className="bg-card border border-border rounded-2xl p-3 flex items-center gap-3">
      <div className={`h-10 w-10 rounded-full bg-${color}/10 flex items-center justify-center shrink-0`}>
        <Icon className={`h-5 w-5 text-${color}`} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-lg font-bold text-foreground leading-tight">{value}</p>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: isAdmin, isLoading: roleLoading } = useIsAppAdmin();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin_dashboard_stats'],
    queryFn: async () => {
      const day = startOf('day'), week = startOf('week'), month = startOf('month');
      const [
        listingsDay, listingsWeek, listingsMonth, listingsTotal,
        signupsDay, signupsMonth, signupsTotal,
        groupsTotal, requestsPending, contactsTotal,
      ] = await Promise.all([
        countSince('listings', day),
        countSince('listings', week),
        countSince('listings', month),
        countSince('listings', null),
        countSince('profiles', day),
        countSince('profiles', month),
        countSince('profiles', null),
        countSince('groups', null),
        supabase.from('group_join_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending').then(r => r.count || 0),
        countSince('imported_contacts', null),
      ]);
      return { listingsDay, listingsWeek, listingsMonth, listingsTotal, signupsDay, signupsMonth, signupsTotal, groupsTotal, requestsPending, contactsTotal };
    },
    enabled: !!isAdmin,
    refetchInterval: 60_000,
  });

  if (authLoading || roleLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!user || !isAdmin) {
    return (
      <div className="max-w-lg mx-auto p-6 text-center">
        <p className="text-sm text-muted-foreground">Accès réservé aux administrateurs.</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg lg:max-w-4xl mx-auto min-h-full animate-fade-in pb-10">
      <header className="sticky top-0 z-50 bg-card border-b border-border" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 5mm)' }}>
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-full hover:bg-muted">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h1 className="text-base font-bold flex-1 text-foreground flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />Tableau de bord
          </h1>
        </div>
      </header>

      {isLoading || !stats ? (
        <div className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" /></div>
      ) : (
        <div className="p-4 space-y-6">
          <section>
            <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-2">
              <FileText className="h-3.5 w-3.5" />Publications
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <StatCard icon={FileText} label="Aujourd'hui" value={stats.listingsDay} />
              <StatCard icon={FileText} label="Cette semaine" value={stats.listingsWeek} />
              <StatCard icon={FileText} label="Ce mois" value={stats.listingsMonth} />
              <StatCard icon={TrendingUp} label="Total" value={stats.listingsTotal} />
            </div>
          </section>

          <section>
            <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-2">
              <Users className="h-3.5 w-3.5" />Inscriptions
            </h2>
            <div className="grid grid-cols-3 gap-2">
              <StatCard icon={Users} label="Aujourd'hui" value={stats.signupsDay} />
              <StatCard icon={Users} label="Ce mois" value={stats.signupsMonth} />
              <StatCard icon={TrendingUp} label="Total" value={stats.signupsTotal} />
            </div>
          </section>

          <section>
            <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">Activité globale</h2>
            <div className="grid grid-cols-3 gap-2">
              <StatCard icon={Users} label="Groupes" value={stats.groupsTotal} />
              <StatCard icon={Users} label="Demandes en attente" value={stats.requestsPending} />
              <StatCard icon={Users} label="Contacts importés" value={stats.contactsTotal} />
            </div>
          </section>

          <DataTablesSection />
        </div>
      )}
    </div>
  );
}

function PremiumBenefits() {
  return (
    <div className="bg-gradient-to-br from-amber-500/10 to-rose-500/10 border border-amber-500/30 rounded-2xl p-3 text-xs">
      <p className="font-bold text-foreground flex items-center gap-1.5 mb-2"><Sparkles className="h-3.5 w-3.5 text-amber-500" />Avantages Agent Premium</p>
      <ul className="space-y-1 text-muted-foreground">
        <li>• Badge doré visible sur le profil et les annonces</li>
        <li>• Mise en avant prioritaire dans les recherches</li>
        <li>• Nombre illimité d'annonces actives</li>
        <li>• Statistiques détaillées sur les vues et likes</li>
        <li>• Support prioritaire et accès anticipé aux nouveautés</li>
      </ul>
      <p className="text-[10px] text-muted-foreground mt-2 italic">Les administrateurs bénéficient automatiquement de tous les avantages Premium.</p>
    </div>
  );
}

function UserTypeRow({ u }: { u: any }) {
  const qc = useQueryClient();
  const current: AccountType = (u.account_type as AccountType) || 'agent';
  const meta = TYPE_META[current];
  const Icon = meta.icon;
  const [imp, setImp] = useState(false);
  const [stars, setStarsState] = useState<number>(u.is_admin ? 5 : (u.account_type === 'agent_premium' ? 5 : (u.stars || 0)));
  const [showStars, setShowStarsState] = useState<boolean>(u.show_stars !== false);

  const update = async (val: AccountType) => {
    const patch: any = { account_type: val };
    if (val === 'agent_premium') patch.stars = 5;
    const { error } = await supabase.from('profiles').update(patch).eq('user_id', u.user_id);
    if (error) { toast({ title: 'Erreur', description: error.message, variant: 'destructive' }); return; }
    if (val === 'agent_premium') setStarsState(5);
    toast({ title: 'Type de compte mis à jour' });
    qc.invalidateQueries({ queryKey: ['admin_data_tables'] });
  };

  const updateStars = async (val: number) => {
    setStarsState(val);
    const { error } = await supabase.from('profiles').update({ stars: val }).eq('user_id', u.user_id);
    if (error) { toast({ title: 'Erreur', variant: 'destructive' }); return; }
    qc.invalidateQueries({ queryKey: ['admin_data_tables'] });
    qc.invalidateQueries({ queryKey: ['profile'] });
  };

  const toggleShowStars = async () => {
    const next = !showStars;
    setShowStarsState(next);
    const { error } = await supabase.from('profiles').update({ show_stars: next }).eq('user_id', u.user_id);
    if (error) { setShowStarsState(!next); toast({ title: 'Erreur', variant: 'destructive' }); return; }
    toast({ title: next ? 'Étoiles visibles' : 'Étoiles masquées' });
    qc.invalidateQueries({ queryKey: ['profile'] });
  };

  const loginAs = async () => {
    if (!confirm(`Se connecter en tant que "${(u.first_name || '') + ' ' + (u.last_name || '')}" ?\n\nVotre session admin sera remplacée.`)) return;
    setImp(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-impersonate', { body: { target_user_id: u.user_id } });
      if (error) throw error;
      if (!data?.email || !data?.token_hash) throw new Error('Réponse invalide');
      const { error: vErr } = await supabase.auth.verifyOtp({ type: 'magiclink', email: data.email, token_hash: data.token_hash } as any);
      if (vErr) throw vErr;
      toast({ title: 'Connecté en tant que ' + (u.first_name || u.email || u.phone) });
      window.location.href = '/';
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message || 'Impersonation impossible', variant: 'destructive' });
    } finally { setImp(false); }
  };

  return (
    <div className="px-3 py-2 text-xs">
      <div className="flex items-center gap-2">
        <span className="font-medium text-foreground flex-1 truncate">{`${u.first_name || ''} ${u.last_name || ''}`.trim() || '—'}</span>
        <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border ${u.is_admin ? TYPE_META.admin.cls : meta.cls}`}>
          {u.is_admin ? <Shield className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
          {u.is_admin ? 'Admin' : meta.label}
        </span>
        <select
          value={current}
          onChange={e => update(e.target.value as AccountType)}
          className="text-[10px] bg-muted rounded-md border border-border px-1 py-0.5 text-foreground"
        >
          <option value="agent">Agent</option>
          <option value="agent_premium">Premium</option>
          <option value="admin">Admin</option>
        </select>
        <button onClick={loginAs} disabled={imp} title="Se connecter en tant que" className="p-1 rounded hover:bg-primary/10 text-primary">
          {imp ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogIn className="h-3.5 w-3.5" />}
        </button>
      </div>
      <div className="flex items-center gap-2 mt-1.5">
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} onClick={() => updateStars(n)} title={`${n} étoile${n>1?'s':''}`} className="hover:scale-110 transition">
              <Star className={`h-4 w-4 ${n <= stars ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground/40'}`} />
            </button>
          ))}
          {stars > 0 && (
            <button onClick={() => updateStars(0)} title="Retirer" className="ml-1 text-[10px] text-muted-foreground hover:text-destructive">✕</button>
          )}
        </div>
        <button
          onClick={toggleShowStars}
          title={showStars ? 'Masquer les étoiles dans les groupes' : 'Afficher les étoiles dans les groupes'}
          className={`ml-auto text-[10px] px-2 py-0.5 rounded-full border transition ${showStars ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : 'bg-muted text-muted-foreground border-border'}`}
        >
          {showStars ? '★ visible' : '★ masqué'}
        </button>
      </div>
    </div>
  );
}

function DataTablesSection() {
  const { data } = useQuery({
    queryKey: ['admin_data_tables'],
    queryFn: async () => {
      const [usersRpc, listings, groups] = await Promise.all([
        supabase.rpc('admin_list_profiles' as any, { _limit: 50 }),
        supabase.from('listings').select('id, title, description, created_at, user_id, is_featured').order('created_at', { ascending: false }).limit(30),
        supabase.from('groups').select('id, name, created_at, created_by, visibility_stars').order('created_at', { ascending: false }).limit(50),
      ]);
      return { users: (usersRpc.data as any[]) || [], listings: listings.data || [], groups: groups.data || [] };
    },
    refetchInterval: 60_000,
  });

  if (!data) return null;
  return (
    <section className="space-y-4">
      <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
        <Database className="h-3.5 w-3.5" />Base de données
      </h2>

      <PremiumBenefits />

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-3 py-2 bg-muted text-xs font-semibold text-foreground flex items-center justify-between">
          <span>Utilisateurs ({data.users.length})</span>
          <span className="text-[10px] text-muted-foreground">Type · Se connecter en tant que</span>
        </div>
        <div className="divide-y divide-border max-h-96 overflow-y-auto">
          {data.users.map((u: any) => <UserTypeRow key={u.user_id} u={u} />)}
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-3 py-2 bg-muted text-xs font-semibold text-foreground">Annonces ({data.listings.length})</div>
        <div className="divide-y divide-border max-h-72 overflow-y-auto">
          {data.listings.map((l: any) => <ListingAdminRow key={l.id} l={l} users={data.users} />)}
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-3 py-2 bg-muted text-xs font-semibold text-foreground">Groupes ({data.groups.length})</div>
        <div className="divide-y divide-border max-h-[28rem] overflow-y-auto">
          {data.groups.map((g: any) => <GroupAdminRow key={g.id} g={g} />)}
        </div>
      </div>
    </section>
  );
}

function ListingAdminRow({ l, users }: { l: any; users: any[] }) {
  const qc = useQueryClient();
  const [authorId, setAuthorId] = useState<string>(l.user_id || '');
  const [saving, setSaving] = useState(false);

  const updateAuthor = async (val: string) => {
    setAuthorId(val);
    setSaving(true);
    const { error } = await supabase.from('listings').update({ user_id: val }).eq('id', l.id);
    setSaving(false);
    if (error) { toast({ title: 'Erreur', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Auteur mis à jour' });
    qc.invalidateQueries({ queryKey: ['admin_data_tables'] });
  };

  return (
    <div className="px-3 py-2 text-xs flex items-center gap-2">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">{l.title}</p>
        <p className="text-[10px] text-muted-foreground truncate">{new Date(l.created_at).toLocaleString('fr-FR')}</p>
      </div>
      <select
        value={authorId}
        onChange={e => updateAuthor(e.target.value)}
        disabled={saving}
        className="text-[10px] bg-muted rounded-md border border-border px-1 py-0.5 text-foreground max-w-[40%] truncate"
      >
        {!users.find(u => u.user_id === authorId) && <option value={authorId}>— Auteur inconnu —</option>}
        {users.map(u => (
          <option key={u.user_id} value={u.user_id}>
            {(`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.phone || u.email || u.user_id.slice(0, 8))}
          </option>
        ))}
      </select>
    </div>
  );
}

function GroupAdminRow({ g }: { g: any }) {
  const qc = useQueryClient();
  const del = useDeleteGroup();
  const [stars, setStarsState] = useState<number>(g.visibility_stars || 1);

  const setStars = async (val: number) => {
    setStarsState(val); // optimistic
    const { error } = await supabase.from('groups').update({ visibility_stars: val }).eq('id', g.id);
    if (error) {
      setStarsState(g.visibility_stars || 1);
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: `Visibilité : ${'★'.repeat(val)}` });
    qc.invalidateQueries({ queryKey: ['admin_data_tables'] });
    qc.invalidateQueries({ queryKey: ['all_groups'] });
    qc.invalidateQueries({ queryKey: ['my_groups'] });
    qc.invalidateQueries({ queryKey: ['search_groups'] });
  };

  const handleDelete = () => {
    if (!confirm(`Supprimer définitivement le groupe "${g.name}" et toutes ses annonces ?`)) return;
    del.mutate(g.id, {
      onSuccess: () => {
        toast({ title: 'Groupe supprimé' });
        qc.invalidateQueries({ queryKey: ['admin_data_tables'] });
      },
      onError: (e: any) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
    });
  };

  return (
    <div className="px-3 py-2.5 text-xs flex items-center gap-2">
      <span className="font-medium text-foreground flex-1 truncate">{g.name}</span>
      <div className="flex items-center gap-1">
        {[1, 2, 3].map(n => (
          <button key={n} onClick={() => setStars(n)} className="p-1 hover:scale-110 transition-transform" title={`${n} étoile${n>1?'s':''}`}>
            <Star className={`h-6 w-6 ${n <= stars ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground/40'}`} />
          </button>
        ))}
      </div>
      <button onClick={handleDelete} disabled={del.isPending} className="p-1.5 rounded hover:bg-destructive/10 text-destructive">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

