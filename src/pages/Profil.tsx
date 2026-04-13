import { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Edit2, LogOut, FileText, Save } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useMyListings, useUpdateProfile } from '@/hooks/use-data';
import { useToast } from '@/hooks/use-toast';

export default function Profil() {
  const { user, logout } = useAuth();
  const { data: myListings } = useMyListings();
  const updateProfile = useUpdateProfile();
  const { toast } = useToast();

  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(user?.profile?.first_name || '');
  const [lastName, setLastName] = useState(user?.profile?.last_name || '');
  const [phone, setPhone] = useState(user?.profile?.phone || '');

  const handleSave = () => {
    if (!user) return;
    updateProfile.mutate(
      { userId: user.id, first_name: firstName, last_name: lastName, phone },
      {
        onSuccess: () => { toast({ title: 'Profil mis à jour !' }); setEditing(false); },
        onError: () => toast({ title: 'Erreur', variant: 'destructive' }),
      }
    );
  };

  if (!user) return null;

  const initials = `${user.profile?.first_name?.[0] || ''}${user.profile?.last_name?.[0] || ''}`;

  return (
    <div className="max-w-lg mx-auto px-4 py-4 space-y-4 animate-fade-in">
      <Card className="border-0 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
              {initials || <User className="h-6 w-6" />}
            </div>
            <div className="flex-1">
              {editing ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Prénom" className="rounded-xl text-sm" />
                    <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Nom" className="rounded-xl text-sm" />
                  </div>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Téléphone" className="rounded-xl text-sm" />
                </div>
              ) : (
                <>
                  <p className="text-lg font-bold text-foreground">{user.profile?.first_name} {user.profile?.last_name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                  {user.profile?.phone && <p className="text-xs text-muted-foreground">{user.profile.phone}</p>}
                </>
              )}
            </div>
          </div>
          {editing ? (
            <div className="flex gap-2">
              <Button onClick={handleSave} className="flex-1 rounded-xl" disabled={updateProfile.isPending}><Save className="h-4 w-4 mr-1" />Sauvegarder</Button>
              <Button variant="outline" onClick={() => setEditing(false)} className="rounded-xl">Annuler</Button>
            </div>
          ) : (
            <Button variant="outline" onClick={() => setEditing(true)} className="w-full rounded-xl"><Edit2 className="h-4 w-4 mr-1" />Modifier le profil</Button>
          )}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Mes annonces</h2>
            <span className="text-xs text-muted-foreground ml-auto">{myListings?.length || 0}</span>
          </div>
          {(!myListings || myListings.length === 0) ? (
            <p className="text-xs text-muted-foreground text-center py-4">Aucune annonce publiée</p>
          ) : (
            <div className="space-y-2">
              {myListings.slice(0, 10).map(l => (
                <div key={l.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                  {l.images?.[0] && <img src={l.images[0]} className="h-10 w-10 rounded-lg object-cover" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{l.title}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(l.created_at).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Button variant="destructive" onClick={logout} className="w-full rounded-xl"><LogOut className="h-4 w-4 mr-2" />Se déconnecter</Button>
    </div>
  );
}
