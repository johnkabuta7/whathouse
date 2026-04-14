import { useState, useRef } from 'react';
import { User, Edit2, LogOut, Save, Camera, Eye, Trash2, MessageSquare, Settings, ChevronRight, Moon, Sun, Bell, Volume2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useMyListings, useUpdateProfile, useDeleteListing, useMyGroups, uploadAvatar } from '@/hooks/use-data';
import { useNotificationSettings, useUpdateNotificationSettings } from '@/hooks/use-notifications';
import { useToast } from '@/hooks/use-toast';

export default function Profil() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { data: myListings } = useMyListings();
  const { data: groups } = useMyGroups();
  const { data: notifSettings } = useNotificationSettings();
  const updateNotifSettings = useUpdateNotificationSettings();
  const updateProfile = useUpdateProfile();
  const deleteListing = useDeleteListing();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(user?.profile?.first_name || '');
  const [lastName, setLastName] = useState(user?.profile?.last_name || '');
  const [phone, setPhone] = useState(user?.profile?.phone || '');
  const [activeTab, setActiveTab] = useState<'annonces' | 'infos'>('annonces');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingAvatar(true);
    try {
      const url = await uploadAvatar(file, user.id);
      updateProfile.mutate({ userId: user.id, avatar_url: url }, {
        onSuccess: () => { toast({ title: 'Photo mise à jour !' }); setUploadingAvatar(false); },
        onError: () => { toast({ title: 'Erreur', variant: 'destructive' }); setUploadingAvatar(false); },
      });
    } catch {
      toast({ title: 'Erreur upload', variant: 'destructive' });
      setUploadingAvatar(false);
    }
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
      {/* Profile header - White background */}
      <div className="bg-card px-4 py-6 border-b border-border">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary overflow-hidden">
              {user.profile?.avatar_url ? (
                <img src={user.profile.avatar_url} className="h-full w-full object-cover rounded-full" />
              ) : (
                initials || <User className="h-8 w-8" />
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">{fullName}</h1>
            <p className="text-xs text-muted-foreground">{user.email}</p>
            {user.profile?.phone && <p className="text-xs text-muted-foreground mt-0.5">{user.profile.phone}</p>}
          </div>
          <button onClick={() => setEditing(!editing)} className="p-2 rounded-full hover:bg-muted transition text-muted-foreground">
            <Edit2 className="h-4 w-4" />
          </button>
        </div>

        {/* Stats */}
        <div className="flex gap-4 mt-4">
          <div className="flex-1 text-center bg-primary/10 rounded-xl py-2">
            <p className="text-lg font-bold text-primary">{myListings?.length || 0}</p>
            <p className="text-[10px] text-muted-foreground">Annonces</p>
          </div>
          <div className="flex-1 text-center bg-primary/10 rounded-xl py-2">
            <p className="text-lg font-bold text-primary">{groups?.length || 0}</p>
            <p className="text-[10px] text-muted-foreground">Groupes</p>
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
            <Button onClick={handleSave} size="sm" className="flex-1 rounded-full bg-primary text-primary-foreground" disabled={updateProfile.isPending}>
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
            {/* Dark mode */}
            <div className="w-full flex items-center gap-3 py-3 border-b border-border">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                {theme === 'dark' ? <Moon className="h-4 w-4 text-primary" /> : <Sun className="h-4 w-4 text-primary" />}
              </div>
              <span className="text-sm text-foreground flex-1 text-left">Mode sombre</span>
              <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
            </div>

            {/* Notifications */}
            <div className="w-full flex items-center gap-3 py-3 border-b border-border">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center"><Bell className="h-4 w-4 text-primary" /></div>
              <span className="text-sm text-foreground flex-1 text-left">Notifications sonores</span>
              <Switch
                checked={notifSettings?.sound_enabled ?? true}
                onCheckedChange={(checked) => user && updateNotifSettings.mutate({ userId: user.id, sound_enabled: checked })}
              />
            </div>

            {/* Sound type */}
            {notifSettings?.sound_enabled !== false && (
              <div className="py-3 border-b border-border">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center"><Volume2 className="h-4 w-4 text-primary" /></div>
                  <span className="text-sm text-foreground flex-1">Son : {notifSettings?.sound_type || 'default'}</span>
                </div>
                <div className="flex gap-2 pl-12">
                  {['default', 'chime', 'bell'].map(s => (
                    <button key={s} onClick={() => user && updateNotifSettings.mutate({ userId: user.id, sound_type: s })}
                      className={`px-3 py-1 rounded-full text-xs font-medium ${notifSettings?.sound_type === s || (!notifSettings?.sound_type && s === 'default') ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                      {s}
                    </button>
                  ))}
                </div>
                <div className="pl-12 mt-3">
                  <p className="text-xs text-muted-foreground mb-1">Volume : {notifSettings?.volume ?? 80}%</p>
                  <Slider
                    value={[notifSettings?.volume ?? 80]}
                    onValueChange={([v]) => user && updateNotifSettings.mutate({ userId: user.id, volume: v })}
                    max={100}
                    step={10}
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {/* Account */}
            <button className="w-full flex items-center gap-3 py-3 border-b border-border">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center"><User className="h-4 w-4 text-primary" /></div>
              <span className="text-sm text-foreground flex-1 text-left">Compte</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>

            {/* Logout */}
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
