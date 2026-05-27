import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, Users, FileText, TrendingUp, Loader2, Database } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useIsAppAdmin } from '@/hooks/use-data';
import { useAuth } from '@/contexts/AuthContext';


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
        </div>
      )}
    </div>
  );
}
