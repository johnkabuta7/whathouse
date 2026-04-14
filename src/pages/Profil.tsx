import { useState } from 'react';
import { User, Edit2, LogOut, Save, Camera, Heart, Eye, Trash2, MessageSquare, Users, Settings, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useMyListings, useUpdateProfile, useDeleteListing, useGroups } from '@/hooks/use-data';
import { useToast } from '@/hooks/use-toast';

export default function Profil() {
  const { user, logout } = useAuth();
  const { data: myListings } = useMyListings();
  const { data: groups } = useGroups();
  const updateProfile = useUpdateProfile();
  const deleteListing = useDeleteListing();
  const { toast } = useToast();

  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(user?.profile?.first_name || '');
  const [lastName, setLastName] = useState(user?.profile?.last_name || '');
  const [phone, setPhone] = useState(user?.profile?.phone || '');
  const [activeTab, setActiveTab] = useState<'annonces' | 'infos'>('annonces');

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

  const handleDelete = (id: string) => {
    deleteListing.mutate(id, {
      onSuccess: () => toast({ title: 'Annonce supprimée' }),
    });
  };

  if (!user) return null;

  const initials = `${user.profile?.first_name?.[0] || ''}${user.profile?.last_name?.[0] || ''}`;
  const fullName = `${user.profile?.first_name || ''} ${user.profile?.last_name || ''}`.trim() || 'Utilisateur';

  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      {/* Profile header */}
      <div className="bg-primary text-primary-foreground px-4 py-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="h-20 w-20 rounded-full bg-primary-foreground/10 flex items-center justify-center text-2xl font-bold">
              {user.profile?.avatar_url ? (
                <img src={user.profile.avatar_url} className="h-full w-full object-cover rounded-full" />
              ) : (
                initials || <User className="h-8 w-8" />
              )}
            </div>
            <button className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center">
              <Camera className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold">{fullName}</h1>
            <p className="text-xs text-primary-foreground/70">{user.email}</p>
            {user.profile?.phone && <p className="text-xs text-primary-foreground/70 mt-0.5">{user.profile.phone}</p>}
          </div>
          <button onClick={() => setEditing(!editing)} className="p-2 rounded-full hover:bg-primary-foreground/10 transition">
            <Edit2 className="h-4 w-4" />
          </button>
        </div>

        {/* Stats */}
        <div className="flex gap-4 mt-4">
          <div className="flex-1 text-center bg-primary-foreground/10 rounded-xl py-2">
            <p className="text-lg font-bold">{myListings?.length || 0}</p>
            <p className="text-[10px] text-primary-foreground/70">Annonces</p>
          </div>
          <div className="flex-1 text-center bg-primary-foreground/10 rounded-xl py-2">
            <p className="text-lg font-bold">{groups?.length || 0}</p>
            <p className="text-[10px] text-primary-foreground/70">Groupes</p>
          </div>
        </div>
      </div>

      {/* Edit form */}
      {editing && (
        <div className="px-4 py-3 bg-card border-b border-border animate-slide-up space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Prénom" className="rounded-full text-sm h-9" />
            <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Nom" className="rounded-full text-sm h-9" />
          </div>
          <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Téléphone" className="rounded-full text-sm h-9" />
          <div className="flex gap-2">
            <Button onClick={handleSave} size="sm" className="flex-1 rounded-full bg-secondary text-secondary-foreground" disabled={updateProfile.isPending}>
              <Save className="h-3.5 w-3.5 mr-1" />Sauvegarder
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEditing(false)} className="rounded-full">Annuler</Button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button onClick={() => setActiveTab('annonces')} className={`flex-1 py-3 text-xs font-semibold text-center transition ${activeTab === 'annonces' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}>
          Mes annonces
        </button>
        <button onClick={() => setActiveTab('infos')} className={`flex-1 py-3 text-xs font-semibold text-center transition ${activeTab === 'infos' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}>
          Paramètres
        </button>
      </div>

      {/* Tab content */}
      <div className="px-4 py-3">
        {activeTab === 'annonces' ? (
          (!myListings || myListings.length === 0) ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Aucune annonce publiée</p>
            </div>
          ) : (
            <div className="space-y-2">
              {myListings.map(l => (
                <div key={l.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-card shadow-sm border border-border">
                  {l.images?.[0] ? (
                    <img src={l.images[0]} className="h-14 w-14 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Eye className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{l.title}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(l.created_at).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <button onClick={() => handleDelete(l.id)} className="p-2 text-destructive/60 hover:text-destructive transition">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="space-y-1">
            <button className="w-full flex items-center gap-3 py-3 border-b border-border">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center"><User className="h-4 w-4 text-primary" /></div>
              <span className="text-sm text-foreground flex-1 text-left">Compte</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
            <button className="w-full flex items-center gap-3 py-3 border-b border-border">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center"><Settings className="h-4 w-4 text-primary" /></div>
              <span className="text-sm text-foreground flex-1 text-left">Notifications</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
            <button onClick={logout} className="w-full flex items-center gap-3 py-3">
              <div className="h-9 w-9 rounded-full bg-destructive/10 flex items-center justify-center"><LogOut className="h-4 w-4 text-destructive" /></div>
              <span className="text-sm text-destructive flex-1 text-left">Se déconnecter</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
