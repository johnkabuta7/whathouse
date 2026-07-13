import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Trash2, ChevronRight } from 'lucide-react';
import { useAllDrafts, deleteDraft } from '@/hooks/use-drafts';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

function useGroupNames(ids: string[]) {
  return useQuery({
    queryKey: ['group_names', ids.sort().join(',')],
    queryFn: async () => {
      if (!ids.length) return {} as Record<string, string>;
      const { data } = await supabase.from('groups').select('id, name').in('id', ids);
      const map: Record<string, string> = {};
      data?.forEach(g => { map[g.id] = g.name; });
      return map;
    },
    enabled: ids.length > 0,
  });
}

export default function Drafts() {
  const drafts = useAllDrafts();
  const { data: names } = useGroupNames(drafts.map(d => d.group_id));
  const { toast } = useToast();
  const navigate = useNavigate();

  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      <div className="px-3 py-2.5 flex items-center gap-3 bg-card/60 backdrop-blur-md border-b border-border sticky top-0 z-10" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 8px)' }}>
        <Link to="/" className="text-muted-foreground"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-sm font-bold flex-1 text-foreground">Brouillons</h1>
        <span className="text-xs text-muted-foreground">{drafts.length}</span>
      </div>

      {drafts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-foreground">Aucun brouillon</p>
          <p className="text-xs text-muted-foreground mt-1">Vos annonces non publiées apparaîtront ici.</p>
        </div>
      ) : (
        <div className="px-3 py-3 space-y-2">
          {drafts.map(d => (
            <div key={d.group_id} className="bg-card border border-border rounded-2xl overflow-hidden">
              <button
                onClick={() => navigate(`/group/${d.group_id}?draft=1`)}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/50 transition"
              >
                {d.image_previews[0] ? (
                  <img src={d.image_previews[0]} className="h-12 w-12 rounded-xl object-cover shrink-0" />
                ) : (
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {d.title || 'Sans titre'}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {names?.[d.group_id] || 'Groupe'} • {new Date(d.updated_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                  </p>
                  {d.description && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{d.description}</p>}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
              <div className="px-3 pb-2 flex justify-end">
                <button
                  onClick={() => { deleteDraft(d.group_id); toast({ title: 'Brouillon supprimé' }); }}
                  className="flex items-center gap-1 text-[11px] font-medium text-destructive px-2 py-1 rounded-full hover:bg-destructive/10 transition"
                >
                  <Trash2 className="h-3 w-3" /> Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
