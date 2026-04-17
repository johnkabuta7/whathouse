import { useState, useRef } from 'react';
import { User, Edit2, LogOut, Save, Camera, Eye, Trash2, MessageSquare, Moon, Sun, Bell, Volume2, Play, Heart, Image, MoreVertical, Mail, Bookmark, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useMyListings, useUpdateProfile, useDeleteListing, useUpdateListing, useMyGroups, uploadAvatar, uploadBackground, useIsAppAdmin, useAllSliderBanners, useCreateBanner, useDeleteBanner, uploadBannerImage, useMyFavorites, useProfile } from '@/hooks/use-data';
import { useNotificationSettings, useUpdateNotificationSettings, usePlayTestSound } from '@/hooks/use-notifications';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export default function Profil() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { data: myListings } = useMyListings();
  const { data: myFavorites } = useMyFavorites();
  const { data: groups } = useMyGroups();
  const { data: notifSettings } = useNotificationSettings();
  const { data: isAdmin } = useIsAppAdmin();
  const { data: allBanners } = useAllSliderBanners();
  const { data: profile } = useProfile(user?.id || '');
  const updateNotifSettings = useUpdateNotificationSettings();
  const updateProfile = useUpdateProfile();
  const deleteListing = useDeleteListing();
  const updateListing = useUpdateListing();
  const createBanner = useCreateBanner();
  const deleteBanner = useDeleteBanner();
  const playTestSound = usePlayTestSound();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(user?.profile?.first_name || '');
  const [lastName, setLastName] = useState(user?.profile?.last_name || '');
  const [phone, setPhone] = useState(user?.profile?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [activeTab, setActiveTab] = useState<'annonces' | 'infos' | 'admin'>('annonces');
  const [listingSubTab, setListingSubTab] = useState<'publications' | 'favoris'>('publications');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [editingListing, setEditingListing] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [uploadingBanner, setUploadingBanner] = useState(false);

  // Use live profile data for avatar/background
  const avatarUrl = profile?.avatar_url || user?.profile?.avatar_url;
  const backgroundUrl = (profile as any)?.background_url;

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
        onSuccess: () => {
          toast({ title: 'Photo mise à jour !' });
          setUploadingAvatar(false);
          // Force refresh profile data immediately
          queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
        },
        onError: () => { toast({ title: 'Erreur', variant: 'destructive' }); setUploadingAvatar(false); },
      });
    } catch {
      toast({ title: 'Erreur upload', variant: 'destructive' });
      setUploadingAvatar(false);
    }
  };

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingBg(true);
    try {
      const url = await uploadBackground(file, user.id);
      updateProfile.mutate({ userId: user.id, background_url: url } as any, {
        onSuccess: () => {
          toast({ title: 'Arrière-plan mis à jour !' });
          setUploadingBg(false);
          queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
        },
        onError: () => { toast({ title: 'Erreur', variant: 'destructive' }); setUploadingBg(false); },
      });
    } catch {
      toast({ title: 'Erreur upload', variant: 'destructive' });
      setUploadingBg(false);
    }
  };

  const handleDelete = (id: string) => {
    deleteListing.mutate(id, { onSuccess: () => toast({ title: 'Annonce supprimée' }) });
  };

  const startEdit = (l: any) => {
    setEditingListing(l.id);
    setEditTitle(l.title);
    setEditDesc(l.description || '');
  };

  const saveEdit = () => {
    if (!editingListing) return;
    updateListing.mutate({ id: editingListing, title: editTitle, description: editDesc }, {
      onSuccess: () => { toast({ title: 'Annonce modifiée !' }); setEditingListing(null); },
      onError: () => toast({ title: 'Erreur', variant: 'destructive' }),
    });
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBanner(true);
    try {
      const url = await uploadBannerImage(file);
      createBanner.mutate({ image_url: url, sort_order: (allBanners?.length || 0) }, {
        onSuccess: () => { toast({ title: 'Banner ajouté !' }); setUploadingBanner(false); },
        onError: () => { toast({ title: 'Erreur', variant: 'destructive' }); setUploadingBanner(false); },
      });
    } catch {
      toast({ title: 'Erreur upload', variant: 'destructive' });
      setUploadingBanner(false);
    }
  };

  if (!user) return null;

  const initials = `${user.profile?.first_name?.[0] || ''}${user.profile?.last_name?.[0] || ''}`;
  const fullName = `${user.profile?.first_name || ''} ${user.profile?.last_name || ''}`.trim() || 'Utilisateur';

  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/60 backdrop-blur-md border-b border-border">
        <div className="px-4 py-3 flex items-center gap-3">
          <h1 className="text-lg font-bold flex-1 text-foreground">Profil</h1>
          <button className="p-1.5 rounded-full hover:bg-muted transition">
            <MoreVertical className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
      </header>

      {/* Background + Profile header */}
      <div className="relative">
        <div className="h-32 bg-gradient-to-br from-primary/20 to-secondary/20 overflow-hidden">
          {backgroundUrl && <img src={backgroundUrl} className="w-full h-full object-cover" />}
        </div>
        <button onClick={() => bgInputRef.current?.click()} disabled={uploadingBg}
          className="absolute top-2 right-2 h-8 w-8 rounded-full bg-foreground/30 text-background flex items-center justify-center backdrop-blur-sm">
          <ImageIcon className="h-4 w-4" />
        </button>
        <input ref={bgInputRef} type="file" accept="image/*" onChange={handleBgUpload} className="hidden" />

        <div className="px-4 -mt-12 relative z-10">
          <div className="flex items-end gap-4">
            <div className="relative">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary overflow-hidden border-4 border-card">
                {avatarUrl ? (
                  <img src={avatarUrl} className="h-full w-full object-cover rounded-full" />
                ) : (
                  initials || <User className="h-8 w-8" />
                )}
              </div>
              <button onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar}
                className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md">
                <Camera className="h-3.5 w-3.5" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </div>
            <div className="flex-1 pb-1 min-w-0" />
          </div>
          {/* Name + admin badge on the white area, below the avatar row */}
          <div className="mt-3 px-1">
            <h1 className="text-lg font-bold text-foreground truncate">{fullName}</h1>
            {user.profile?.phone && <p className="text-xs text-muted-foreground">{user.profile.phone}</p>}
            {isAdmin && <span className="text-[10px] bg-primary/15 text-primary px-2 py-0.5 rounded-full font-bold mt-1 inline-block">Admin</span>
            <button onClick={() => setEditing(!editing)} className="p-2 rounded-full hover:bg-muted transition text-muted-foreground mb-1">
              <Edit2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 mt-3">
        <div className="flex gap-4">
          <div className="flex-1 text-center bg-primary/10 rounded-xl py-2">
            <p className="text-lg font-bold text-primary">{myListings?.length || 0}</p>
            <p className="text-[10px] text-muted-foreground">Annonces</p>
          </div>
          <div className="flex-1 text-center bg-primary/10 rounded-xl py-2">
            <p className="text-lg font-bold text-primary">{groups?.length || 0}</p>
            <p className="text-[10px] text-muted-foreground">Groupes</p>
          </div>
          <div className="flex-1 text-center bg-primary/10 rounded-xl py-2">
            <p className="text-lg font-bold text-primary">{myListings?.reduce((s, l) => s + (l.like_count || 0), 0) || 0}</p>
            <p className="text-[10px] text-muted-foreground">Likes</p>
          </div>
        </div>
      </div>

      {editing && (
        <div className="px-4 py-3 bg-card border-y border-border space-y-2 mt-3">
          <div className="grid grid-cols-2 gap-2">
            <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Prénom" className="rounded-full text-sm h-9" />
            <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Nom" className="rounded-full text-sm h-9" />
          </div>
          <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Téléphone" className="rounded-full text-sm h-9" />
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email (optionnel)" className="rounded-full text-sm h-9 pl-10" type="email" />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} size="sm" className="flex-1 rounded-full bg-primary text-primary-foreground" disabled={updateProfile.isPending}>
              <Save className="h-3.5 w-3.5 mr-1" />Sauvegarder
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEditing(false)} className="rounded-full">Annuler</Button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border mt-2">
        <button onClick={() => setActiveTab('annonces')} className={`flex-1 py-3 text-xs font-semibold text-center transition ${activeTab === 'annonces' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}>
          Mes annonces
        </button>
        <button onClick={() => setActiveTab('infos')} className={`flex-1 py-3 text-xs font-semibold text-center transition ${activeTab === 'infos' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}>
          Paramètres
        </button>
        {isAdmin && (
          <button onClick={() => setActiveTab('admin')} className={`flex-1 py-3 text-xs font-semibold text-center transition ${activeTab === 'admin' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}>
            Admin
          </button>
        )}
      </div>

      <div className="px-4 py-3">
        {activeTab === 'annonces' ? (
          <>
            {/* Sub-tabs: Publications / Favoris */}
            <div className="flex gap-2 mb-3">
              <button onClick={() => setListingSubTab('publications')}
                className={`flex-1 py-2 text-xs font-semibold rounded-full transition ${listingSubTab === 'publications' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                Publications
              </button>
              <button onClick={() => setListingSubTab('favoris')}
                className={`flex-1 py-2 text-xs font-semibold rounded-full transition flex items-center justify-center gap-1 ${listingSubTab === 'favoris' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                <Bookmark className="h-3 w-3" />Favoris
              </button>
            </div>

            {listingSubTab === 'publications' ? (
              (!myListings || myListings.length === 0) ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Aucune annonce publiée</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {myListings.map(l => (
                    <div key={l.id}>
                      <div className="flex items-center gap-3 p-2.5 rounded-xl bg-card shadow-sm border border-border">
                        {l.images?.[0] ? (
                          <img src={l.images[0]} className="h-14 w-14 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center shrink-0"><Eye className="h-5 w-5 text-muted-foreground" /></div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{l.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-muted-foreground">{new Date(l.created_at).toLocaleDateString('fr-FR')}</span>
                            <span className="flex items-center gap-0.5 text-[10px] text-destructive"><Heart className="h-3 w-3 fill-current" />{l.like_count || 0}</span>
                          </div>
                        </div>
                        <button onClick={() => startEdit(l)} className="p-2 text-primary/60 hover:text-primary transition">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(l.id)} className="p-2 text-destructive/60 hover:text-destructive transition">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      {editingListing === l.id && (
                        <div className="mt-1 p-3 rounded-xl bg-muted/50 border border-border space-y-2">
                          <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Titre" className="rounded-full text-sm h-9" />
                          <Textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Description" className="rounded-xl text-sm resize-y min-h-[200px]" rows={10} />
                          <div className="flex gap-2">
                            <Button onClick={saveEdit} size="sm" className="flex-1 rounded-full bg-primary text-primary-foreground" disabled={updateListing.isPending}>
                              <Save className="h-3.5 w-3.5 mr-1" />Sauvegarder
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setEditingListing(null)} className="rounded-full">Annuler</Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            ) : (
              /* Favoris tab */
              (!myFavorites || myFavorites.length === 0) ? (
                <div className="text-center py-8">
                  <Bookmark className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Aucun favori</p>
                  <p className="text-xs text-muted-foreground mt-1">Ajoutez des annonces en favoris depuis les groupes</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {myFavorites.map((l: any) => (
                    <div key={l.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-card shadow-sm border border-border">
                      {l.images?.[0] ? (
                        <img src={l.images[0]} className="h-14 w-14 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center shrink-0"><Eye className="h-5 w-5 text-muted-foreground" /></div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{l.title}</p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{l.description?.slice(0, 50) || ''}</p>
                      </div>
                      <Bookmark className="h-4 w-4 text-primary fill-current shrink-0" />
                    </div>
                  ))}
                </div>
              )
            )}
          </>
        ) : activeTab === 'infos' ? (
          <div className="space-y-1">
            <div className="w-full flex items-center gap-3 py-3 border-b border-border">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                {theme === 'dark' ? <Moon className="h-4 w-4 text-primary" /> : <Sun className="h-4 w-4 text-primary" />}
              </div>
              <span className="text-sm text-foreground flex-1 text-left">Mode sombre</span>
              <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
            </div>

            <div className="w-full flex items-center gap-3 py-3 border-b border-border">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center"><Bell className="h-4 w-4 text-primary" /></div>
              <span className="text-sm text-foreground flex-1 text-left">Notifications sonores</span>
              <Switch
                checked={notifSettings?.sound_enabled ?? true}
                onCheckedChange={(checked) => user && updateNotifSettings.mutate({ userId: user.id, sound_enabled: checked })}
              />
            </div>

            {notifSettings?.sound_enabled !== false && (
              <div className="py-3 border-b border-border">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center"><Volume2 className="h-4 w-4 text-primary" /></div>
                  <span className="text-sm text-foreground flex-1">Son : {notifSettings?.sound_type || 'default'}</span>
                  <button onClick={playTestSound} className="p-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition">
                    <Play className="h-3.5 w-3.5" />
                  </button>
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
                    max={100} step={10} className="w-full"
                  />
                </div>
              </div>
            )}

            <button onClick={logout} className="w-full flex items-center gap-3 py-3">
              <div className="h-9 w-9 rounded-full bg-destructive/10 flex items-center justify-center"><LogOut className="h-4 w-4 text-destructive" /></div>
              <span className="text-sm text-destructive flex-1 text-left">Se déconnecter</span>
            </button>
          </div>
        ) : (
          /* Admin tab */
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2"><Image className="h-4 w-4 text-primary" />Gérer les sliders</h3>
              <div className="space-y-2">
                {allBanners?.map(b => (
                  <div key={b.id} className="flex items-center gap-3 p-2 rounded-xl bg-card border border-border">
                    <img src={b.image_url} className="h-10 w-20 rounded-lg object-cover" />
                    <span className="flex-1 text-xs text-muted-foreground truncate">{b.image_url.split('/').pop()}</span>
                    <button onClick={() => deleteBanner.mutate(b.id)} className="p-1.5 text-destructive"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
                <button onClick={() => bannerInputRef.current?.click()} disabled={uploadingBanner}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-primary/30 text-primary text-sm font-medium hover:bg-primary/5 transition">
                  <Image className="h-4 w-4" />{uploadingBanner ? 'Upload...' : 'Ajouter un slider'}
                </button>
                <input ref={bannerInputRef} type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
