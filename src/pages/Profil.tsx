import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { User, Users, Edit2, LogOut, Save, Camera, Eye, EyeOff, Trash2, MessageSquare, Moon, Sun, Bell, Volume2, Play, Heart, Image, MoreVertical, Mail, Bookmark, ImageIcon, ShieldCheck, Sparkles, BookOpen, ChevronRight, FileText, ImagePlus, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme, THEME_STYLES } from '@/contexts/ThemeContext';
import { useAllDrafts, deleteDraft } from '@/hooks/use-drafts';
import { useMyListings, useUpdateProfile, useDeleteListing, useUpdateListing, useMyGroups, uploadAvatar, uploadBackground, uploadListingImage, useIsAppAdmin, useAllSliderBanners, useCreateBanner, useDeleteBanner, useUpdateBanner, uploadBannerImage, useMyFavorites, useProfile } from '@/hooks/use-data';
import { useNotificationSettings, useUpdateNotificationSettings, usePlayTestSound } from '@/hooks/use-notifications';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

import Login from '@/pages/Login';

export default function Profil() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Login />;
  return <ProfilLogged />;
}

function ProfilLogged() {
  const { user, logout, updateEmail, updatePassword } = useAuth();
  const { theme, toggleTheme, themeStyle, setThemeStyle } = useTheme();
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
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState(false);
  useEffect(() => {
    const handler = () => setEditing(true);
    window.addEventListener('profil:edit', handler as any);
    return () => window.removeEventListener('profil:edit', handler as any);
  }, []);
  const [firstName, setFirstName] = useState(user?.profile?.first_name || '');
  const [lastName, setLastName] = useState(user?.profile?.last_name || '');
  const [phone, setPhone] = useState(user?.profile?.phone || '');
  const [email, setEmail] = useState(user?.email && !user.email.startsWith('phone_') ? user.email : '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as 'annonces' | 'infos' | 'admin') || 'annonces';
  const [activeTab, setActiveTab] = useState<'annonces' | 'infos' | 'admin'>(initialTab);
  useEffect(() => {
    const t = searchParams.get('tab') as 'annonces' | 'infos' | 'admin' | null;
    if (t && ['annonces', 'infos', 'admin'].includes(t)) setActiveTab(t);
  }, [searchParams]);
  const [listingSubTab, setListingSubTab] = useState<'publications' | 'favoris' | 'brouillons'>('publications');
  const drafts = useAllDrafts();
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [editingListing, setEditingListing] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editImages, setEditImages] = useState<string[]>([]);
  const [editUploading, setEditUploading] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [showStylePicker, setShowStylePicker] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);

  // Use live profile data for avatar/background
  const avatarUrl = profile?.avatar_url || user?.profile?.avatar_url;
  const backgroundUrl = (profile as any)?.background_url;

  useEffect(() => {
    setFirstName(profile?.first_name || user?.profile?.first_name || '');
    setLastName(profile?.last_name || user?.profile?.last_name || '');
    setPhone(profile?.phone || user?.profile?.phone || '');
    setEmail((profile as any)?.email || user?.email || '');
  }, [profile, user?.email, user?.profile]);

  const handleSave = async () => {
    if (!user) return;
    if (email && email.trim() && email !== user.email) {
      const ok = await updateEmail(email.trim());
      if (!ok) { toast({ title: 'Email non modifié', description: 'Format invalide ou déjà utilisé', variant: 'destructive' }); return; }
    }
    if (password && password.trim()) {
      if (password.length < 6) { toast({ title: 'Mot de passe trop court', description: 'Minimum 6 caractères', variant: 'destructive' }); return; }
      const ok = await updatePassword(password.trim());
      if (!ok) { toast({ title: 'Mot de passe non modifié', variant: 'destructive' }); return; }
    }
    updateProfile.mutate(
      { userId: user.id, first_name: firstName, last_name: lastName, phone, email },
      {
        onSuccess: () => { toast({ title: 'Profil mis à jour !' }); setEditing(false); setPassword(''); },
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
    setEditImages(Array.isArray(l.images) ? [...l.images] : []);
  };

  const handleEditAddImages = async (files: FileList | null) => {
    if (!files || !user) return;
    setEditUploading(true);
    try {
      const urls: string[] = [];
      for (const f of Array.from(files)) {
        if (!f.type.startsWith('image/')) continue;
        urls.push(await uploadListingImage(f, user.id));
      }
      setEditImages(p => [...p, ...urls]);
    } catch (err: any) {
      toast({ title: 'Erreur upload', description: err?.message || 'Impossible d\'ajouter les images', variant: 'destructive' });
    } finally {
      setEditUploading(false);
    }
  };

  const removeEditImage = (i: number) => setEditImages(p => p.filter((_, idx) => idx !== i));

  const saveEdit = () => {
    if (!editingListing) return;
    updateListing.mutate({ id: editingListing, title: editTitle, description: editDesc, images: editImages }, {
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
    <div className="max-w-lg mx-auto min-h-full animate-fade-in pb-32">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 5mm)' }}>
        <div className="px-4 py-3 flex items-center gap-3 relative">
          <h1 className="text-lg font-bold flex-1 text-foreground">Profil</h1>
          <button
            onClick={() => setShowHeaderMenu(s => !s)}
            className="p-1.5 rounded-full hover:bg-muted transition"
            aria-label="Menu"
          >
            <MoreVertical className="h-5 w-5 text-muted-foreground" />
          </button>
          {showHeaderMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowHeaderMenu(false)} />
              <div className="absolute right-3 top-full mt-1 z-50 min-w-[180px] bg-card border border-border rounded-xl shadow-lg overflow-hidden animate-fade-in">
                <button
                  onClick={() => { setShowHeaderMenu(false); setEditing(true); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-foreground hover:bg-muted transition text-left"
                >
                  <Edit2 className="h-4 w-4 text-muted-foreground" /> Modifier le profil
                </button>
                <button
                  onClick={() => { setShowHeaderMenu(false); setActiveTab('infos'); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-foreground hover:bg-muted transition text-left border-t border-border"
                >
                  <Sparkles className="h-4 w-4 text-muted-foreground" /> Paramètres
                </button>
                <button
                  onClick={() => { setShowHeaderMenu(false); logout(); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition text-left border-t border-border"
                >
                  <LogOut className="h-4 w-4" /> Se déconnecter
                </button>
              </div>
            </>
          )}
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
          <div className="mt-3 px-1 flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-foreground truncate">{fullName}</h1>
              {phone && <p className="text-xs text-muted-foreground truncate">{phone}</p>}
              {email && <p className="text-xs text-muted-foreground truncate">{email}</p>}
              {isAdmin && <span className="text-[10px] bg-primary/15 text-primary px-2 py-0.5 rounded-full font-bold mt-1 inline-block">Admin</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 mt-3">
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setActiveTab('annonces')}
            className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 bg-card border border-border active:scale-[0.97] transition"
          >
            <MessageSquare className="h-3.5 w-3.5 text-primary shrink-0" />
            <div className="min-w-0 text-left">
              <p className="text-sm font-bold leading-none text-foreground">{myListings?.length || 0}</p>
              <p className="text-[9px] text-muted-foreground leading-tight">Annonces</p>
            </div>
          </button>
          <Link
            to="/"
            className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 bg-card border border-border active:scale-[0.97] transition"
          >
            <Users className="h-3.5 w-3.5 text-primary shrink-0" />
            <div className="min-w-0 text-left">
              <p className="text-sm font-bold leading-none text-foreground">{groups?.length || 0}</p>
              <p className="text-[9px] text-muted-foreground leading-tight">Groupes</p>
            </div>
          </Link>
          <div className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 bg-card border border-border">
            <Heart className="h-3.5 w-3.5 text-destructive shrink-0" />
            <div className="min-w-0 text-left">
              <p className="text-sm font-bold leading-none text-foreground">
                {myListings?.reduce((s, l) => s + (l.like_count || 0), 0) || 0}
              </p>
              <p className="text-[9px] text-muted-foreground leading-tight">Likes</p>
            </div>
          </div>
        </div>
      </div>

      {editing && (
        <div className="px-4 py-3 bg-card border-y border-border space-y-2 mt-3">
          <div className="grid grid-cols-2 gap-2">
            <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Prénom" className="rounded-full text-sm h-9" />
            <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Nom" className="rounded-full text-sm h-9" />
          </div>
          <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Téléphone (+33...)" className="rounded-full text-sm h-9" />
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="Votre email (optionnel)" className="rounded-full text-sm h-9 pl-10" type="email" />
          </div>
          <div className="relative">
            <Input
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Nouveau mot de passe (laisser vide pour ne pas changer)"
              className="rounded-full text-sm h-9 pr-10"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
            />
            <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground">L'email et le mot de passe vous permettront de récupérer votre compte. Non obligatoires.</p>
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
            {/* Sub-tabs: underline 1/4 width centered */}
            <div className="flex mb-3 relative">
              <button onClick={() => setListingSubTab('publications')}
                className={`flex-1 py-2 text-xs font-semibold text-center transition relative ${listingSubTab === 'publications' ? 'text-primary' : 'text-muted-foreground'}`}>
                Publications
                {listingSubTab === 'publications' && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-1/4 bg-primary rounded-full" />}
              </button>
              <button onClick={() => setListingSubTab('favoris')}
                className={`flex-1 py-2 text-xs font-semibold text-center transition flex items-center justify-center gap-1 relative ${listingSubTab === 'favoris' ? 'text-primary' : 'text-muted-foreground'}`}>
                <Bookmark className="h-3 w-3" />Favoris
                {listingSubTab === 'favoris' && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-1/4 bg-primary rounded-full" />}
              </button>
              <button onClick={() => setListingSubTab('brouillons')}
                className={`flex-1 py-2 text-xs font-semibold text-center transition flex items-center justify-center gap-1 relative ${listingSubTab === 'brouillons' ? 'text-primary' : 'text-muted-foreground'}`}>
                <FileText className="h-3 w-3" />Brouillons
                {drafts.length > 0 && (
                  <span className="ml-1 h-4 min-w-[16px] rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground inline-flex items-center justify-center px-1">{drafts.length}</span>
                )}
                {listingSubTab === 'brouillons' && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-1/4 bg-primary rounded-full" />}
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
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[10px] text-muted-foreground">{new Date(l.created_at).toLocaleDateString('fr-FR')}</span>
                            <span className="flex items-center gap-0.5 text-[10px] text-destructive"><Heart className="h-3 w-3 fill-current" />{l.like_count || 0}</span>
                            {(l as any).shared_in_groups > 1 && (
                              <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                                {(l as any).shared_in_groups} groupes
                              </span>
                            )}
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

                          {/* Photos */}
                          <div className="space-y-2">
                            <p className="text-[11px] font-semibold text-muted-foreground">Photos ({editImages.length})</p>
                            <div className="flex gap-2 flex-wrap items-center">
                              {editImages.map((src, i) => (
                                <div key={i} className="relative h-16 w-16 rounded-lg overflow-hidden border border-border shrink-0">
                                  <img src={src} className="h-full w-full object-cover" />
                                  <button type="button" onClick={() => removeEditImage(i)} aria-label="Supprimer la photo"
                                    className="absolute top-0 right-0 bg-foreground/70 text-background rounded-full p-0.5">
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                              <label className="cursor-pointer h-16 w-16 rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 flex items-center justify-center text-primary shrink-0">
                                <input type="file" accept="image/*" multiple className="hidden" onChange={e => handleEditAddImages(e.target.files)} />
                                {editUploading ? (
                                  <div className="h-4 w-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                ) : (
                                  <ImagePlus className="h-5 w-5" />
                                )}
                              </label>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button onClick={saveEdit} size="sm" className="flex-1 rounded-full bg-primary text-primary-foreground" disabled={updateListing.isPending || editUploading}>
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
            ) : listingSubTab === 'favoris' ? (
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
            ) : (
              /* Brouillons tab — anciennement page dédiée /drafts */
              drafts.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Aucun brouillon</p>
                  <p className="text-xs text-muted-foreground mt-1">Vos annonces non publiées apparaîtront ici.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {drafts.map(d => (
                    <div key={d.group_id} className="bg-card border border-border rounded-xl overflow-hidden">
                      <button
                        onClick={() => navigate(`/group/${d.group_id}?draft=1`)}
                        className="w-full flex items-center gap-3 p-2.5 text-left hover:bg-muted/50 transition"
                      >
                        {d.image_previews[0] ? (
                          <img src={d.image_previews[0]} className="h-12 w-12 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <FileText className="h-5 w-5 text-primary" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{d.title || 'Sans titre'}</p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {new Date(d.updated_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </button>
                      <div className="px-3 pb-2 flex justify-end">
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteDraft(d.group_id); toast({ title: 'Brouillon supprimé' }); }}
                          className="flex items-center gap-1 text-[11px] font-medium text-destructive px-2 py-1 rounded-full hover:bg-destructive/10 transition"
                        >
                          <Trash2 className="h-3 w-3" /> Supprimer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </>
        ) : activeTab === 'infos' ? (
          <div className="space-y-1">
            {themeStyle !== 'mocha' && (
              <div className="w-full flex items-center gap-3 py-3 border-b border-border">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                  {theme === 'dark' ? <Moon className="h-4 w-4 text-primary" /> : <Sun className="h-4 w-4 text-primary" />}
                </div>
                <span className="text-sm text-foreground flex-1 text-left">Mode sombre</span>
                <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
              </div>
            )}

            <div className="py-3 border-b border-border">
              <button
                type="button"
                onClick={() => setShowStylePicker(s => !s)}
                className="w-full flex items-center gap-3"
              >
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center"><Sparkles className="h-4 w-4 text-primary" /></div>
                <span className="text-sm text-foreground flex-1 text-left">Style de thème</span>
                <span className="text-[11px] text-muted-foreground capitalize">{themeStyle}</span>
                <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${showStylePicker ? 'rotate-90' : ''}`} />
              </button>
              {showStylePicker && (
                <div className="grid grid-cols-3 gap-2 mt-3 pl-12 pr-1 animate-fade-in">
                  {THEME_STYLES.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setThemeStyle(s.id)}
                      className={`flex flex-col items-center gap-1.5 py-2 px-1 rounded-lg transition ${themeStyle === s.id ? 'bg-primary/10 ring-1 ring-primary' : 'hover:bg-muted/50 border border-border'}`}
                    >
                      <div
                        className="h-6 w-6 rounded-sm shrink-0 border border-border"
                        style={{ background: s.preview }}
                      />
                      <span className="text-[11px] font-medium text-foreground capitalize">{s.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* La couleur d'accent est maintenant fixée par le style de thème (classique → orange, mocha → cuivré, nature → bleu). */}

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

            <Link to="/legal/tuto" className="w-full flex items-center gap-3 py-3 border-b border-border">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center"><BookOpen className="h-4 w-4 text-primary" /></div>
              <span className="text-sm text-foreground flex-1 text-left">Tuto — Comment ça marche</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link to="/legal/avantages" className="w-full flex items-center gap-3 py-3 border-b border-border">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center"><Sparkles className="h-4 w-4 text-primary" /></div>
              <span className="text-sm text-foreground flex-1 text-left">Avantages de l'application</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link to="/legal/terms" className="w-full flex items-center gap-3 py-3 border-b border-border">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center"><ShieldCheck className="h-4 w-4 text-primary" /></div>
              <span className="text-sm text-foreground flex-1 text-left">Termes & Confidentialité</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>

            <button onClick={logout} className="w-full flex items-center gap-3 py-3">
              <div className="h-9 w-9 rounded-full bg-destructive/10 flex items-center justify-center"><LogOut className="h-4 w-4 text-destructive" /></div>
              <span className="text-sm text-destructive flex-1 text-left">Se déconnecter</span>
            </button>
          </div>
        ) : (
          /* Admin tab */
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2"><Image className="h-4 w-4 text-primary" />Gérer les sliders (image + texte)</h3>
              <div className="space-y-2">
                {allBanners?.map(b => <BannerEditor key={b.id} banner={b} />)}
                <button onClick={() => bannerInputRef.current?.click()} disabled={uploadingBanner}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-primary/30 text-primary text-sm font-medium hover:bg-primary/5 transition">
                  <Image className="h-4 w-4" />{uploadingBanner ? 'Upload...' : 'Ajouter un slider'}
                </button>
                <input ref={bannerInputRef} type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" />
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">Pour modifier les pages Tuto, Avantages et Termes : ouvrez la page concernée et utilisez le bouton + dans son entête.</p>
            </div>
            <NewSignupsList />
          </div>
        )}
      </div>
    </div>
  );
}

function BannerEditor({ banner }: { banner: any }) {
  const [caption, setCaption] = useState(banner.caption || '');
  const updateBanner = useUpdateBanner();
  const deleteBanner = useDeleteBanner();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleImg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadBannerImage(file);
      updateBanner.mutate({ id: banner.id, image_url: url }, {
        onSuccess: () => { toast({ title: 'Image mise à jour' }); setUploading(false); },
        onError: () => { toast({ title: 'Erreur', variant: 'destructive' }); setUploading(false); },
      });
    } catch { setUploading(false); }
  };

  const save = () => {
    updateBanner.mutate({ id: banner.id, caption }, {
      onSuccess: () => toast({ title: 'Texte publié — visible sur l\'accueil' }),
    });
  };

  return (
    <div className="p-2 rounded-xl bg-card border border-border space-y-2">
      <div className="flex items-center gap-2">
        <img src={banner.image_url} className="h-12 w-20 rounded-lg object-cover" />
        <div className="flex-1 flex gap-1">
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary">
            {uploading ? '...' : 'Changer image'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleImg} className="hidden" />
          <button onClick={() => deleteBanner.mutate(banner.id)} className="p-1 text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <Input value={caption} onChange={e => setCaption(e.target.value)} placeholder="Texte affiché sur le slider..." className="text-xs h-8 rounded-full" />
      <div className="flex justify-end">
        <Button onClick={save} size="sm" className="h-7 rounded-full text-[11px] px-4 bg-primary text-primary-foreground" disabled={updateBanner.isPending}>
          Publier
        </Button>
      </div>
    </div>
  );
}

function NewSignupsList() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin_new_signups'],
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, phone, created_at, avatar_url')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60_000,
  });

  return (
    <div>
      <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
        <User className="h-4 w-4 text-primary" />
        Nouveaux inscrits
        <span className="ml-auto text-xs font-bold bg-primary/15 text-primary px-2 py-0.5 rounded-full">
          {isLoading ? '…' : (data?.length || 0)}
        </span>
      </h3>
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Chargement…</p>
      ) : !data || data.length === 0 ? (
        <p className="text-xs text-muted-foreground">Aucun nouvel inscrit ces 30 derniers jours.</p>
      ) : (
        <div className="space-y-1 max-h-64 overflow-y-auto rounded-xl border border-border bg-card">
          {data.map((p: any) => {
            const name = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Sans nom';
            const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2);
            return (
              <Link
                to={`/contact/${p.user_id}`}
                key={p.user_id}
                className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 transition border-b border-border last:border-b-0"
              >
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary overflow-hidden shrink-0">
                  {p.avatar_url ? <img src={p.avatar_url} className="h-full w-full object-cover" /> : initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{p.phone || '—'}</p>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {new Date(p.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

