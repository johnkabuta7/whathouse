import { Link } from 'react-router-dom';
import { Plus, Users, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useGroups } from '@/hooks/use-data';

export default function Index() {
  const { user } = useAuth();
  const { data: groups, isLoading } = useGroups();

  if (isLoading) {
    return (
      <div className="px-4 py-6 max-w-lg mx-auto space-y-3">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="px-4 py-2 max-w-lg mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-foreground">Groupes</h1>
        <Button size="sm" asChild className="rounded-xl">
          <Link to="/create-group"><Plus className="h-4 w-4 mr-1" />Créer</Link>
        </Button>
      </div>

      {(!groups || groups.length === 0) ? (
        <div className="text-center py-16">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Aucun groupe pour l'instant</p>
          <p className="text-xs text-muted-foreground mt-1">Créez votre premier groupe immobilier</p>
          <Button size="sm" asChild className="mt-4 rounded-xl">
            <Link to="/create-group"><Plus className="h-4 w-4 mr-1" />Créer un groupe</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map(group => (
            <Link key={group.id} to={`/group/${group.id}`}>
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow active:scale-[0.98] cursor-pointer mb-2">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                    {group.image_url ? (
                      <img src={group.image_url} alt={group.name} className="h-full w-full object-cover rounded-xl" />
                    ) : (
                      <Users className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{group.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{group.description || 'Groupe immobilier'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(group.updated_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
