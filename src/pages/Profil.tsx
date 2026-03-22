import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Settings, Heart, Clock, LogIn, UserPlus, ChevronRight, Bell, 
  HelpCircle, Shield, LogOut, Building2, Plus, Eye, Star, Edit, Trash2,
  MapPin, Phone, Mail, Camera, Check, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import logo from '@/assets/logo.png';

type UserType = 'visitor' | 'owner' | null;

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  type: UserType;
}

interface Listing {
  id: number;
  title: string;
  type: 'restaurant' | 'sejour' | 'attraction';
  status: 'published' | 'pending' | 'draft';
  views: number;
  favorites: number;
  rating: number;
  createdAt: string;
}

export default function Profil() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userType, setUserType] = useState<UserType>(null);
  const [notifications, setNotifications] = useState(true);
  const [showNewListingForm, setShowNewListingForm] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: '',
    email: '',
    phone: '',
    whatsapp: '',
    type: null
  });

  const [userListings, setUserListings] = useState<Listing[]>([]);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [history, setHistory] = useState<{ id: number; title: string; type: string; date: string }[]>([]);

  // New listing form state
  const [newListing, setNewListing] = useState({
    title: '',
    type: 'restaurant' as 'restaurant' | 'sejour' | 'attraction',
    description: '',
    address: '',
    phone: '',
    whatsapp: '',
    price: '',
  });

  // Load saved data on mount
  useEffect(() => {
    const savedProfile = localStorage.getItem('user_profile');
    if (savedProfile) {
      const profile = JSON.parse(savedProfile);
      setUserProfile(profile);
      setIsLoggedIn(true);
      setUserType(profile.type);
    }

    const savedListings = localStorage.getItem('user_listings');
    if (savedListings) {
      setUserListings(JSON.parse(savedListings));
    }

    const savedFavorites = JSON.parse(localStorage.getItem('user_favorites') || '[]');
    setFavorites(savedFavorites);

    // Generate history from views
    const viewHistory: { id: number; title: string; type: string; date: string }[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('listing_views_')) {
        const id = parseInt(key.replace('listing_views_', ''));
        viewHistory.push({
          id,
          title: `Annonce #${id}`,
          type: 'listing',
          date: new Date().toLocaleDateString('fr-FR')
        });
      }
    }
    setHistory(viewHistory.slice(0, 10));
  }, []);

  // Calculate real stats for owners
  const calculateStats = () => {
    let totalViews = 0;
    let totalFavorites = 0;
    let totalRatings = 0;
    let ratingSum = 0;
    let ratingCount = 0;

    userListings.forEach(listing => {
      const views = parseInt(localStorage.getItem(`listing_views_${listing.id}`) || '0');
      const favs = parseInt(localStorage.getItem(`listing_fav_count_${listing.id}`) || '0');
      const ratings = JSON.parse(localStorage.getItem(`listing_ratings_${listing.id}`) || '[]');
      
      totalViews += views;
      totalFavorites += favs;
      if (ratings.length > 0) {
        ratingSum += ratings.reduce((a: number, b: number) => a + b, 0);
        ratingCount += ratings.length;
      }
    });

    return {
      views: totalViews,
      favorites: totalFavorites,
      rating: ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 10) / 10 : 0
    };
  };

  const handleLogin = (type: UserType) => {
    const profile: UserProfile = {
      name: type === 'owner' ? 'Mon Établissement' : 'Visiteur',
      email: '',
      phone: '',
      whatsapp: '',
      type
    };
    setUserProfile(profile);
    setUserType(type);
    setIsLoggedIn(true);
    localStorage.setItem('user_profile', JSON.stringify(profile));
    toast.success('Connexion réussie !');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserType(null);
    setUserProfile({ name: '', email: '', phone: '', whatsapp: '', type: null });
    localStorage.removeItem('user_profile');
    toast.info('Déconnexion réussie');
  };

  const handleSaveProfile = () => {
    localStorage.setItem('user_profile', JSON.stringify(userProfile));
    setShowEditProfile(false);
    toast.success('Profil mis à jour !');
  };

  const handleCreateListing = () => {
    if (!newListing.title || !newListing.description) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const listing: Listing = {
      id: Date.now(),
      title: newListing.title,
      type: newListing.type,
      status: 'pending',
      views: 0,
      favorites: 0,
      rating: 0,
      createdAt: new Date().toISOString()
    };

    const updatedListings = [...userListings, listing];
    setUserListings(updatedListings);
    localStorage.setItem('user_listings', JSON.stringify(updatedListings));
    
    // Save listing details
    localStorage.setItem(`listing_data_${listing.id}`, JSON.stringify({
      ...newListing,
      id: listing.id
    }));

    setNewListing({
      title: '',
      type: 'restaurant',
      description: '',
      address: '',
      phone: '',
      whatsapp: '',
      price: '',
    });
    setShowNewListingForm(false);
    toast.success('Annonce créée ! En attente de validation.');
  };

  const handleDeleteListing = (id: number) => {
    const updatedListings = userListings.filter(l => l.id !== id);
    setUserListings(updatedListings);
    localStorage.setItem('user_listings', JSON.stringify(updatedListings));
    localStorage.removeItem(`listing_data_${id}`);
    toast.success('Annonce supprimée');
  };

  const handlePublishListing = (id: number) => {
    const updatedListings = userListings.map(l => 
      l.id === id ? { ...l, status: 'published' as const } : l
    );
    setUserListings(updatedListings);
    localStorage.setItem('user_listings', JSON.stringify(updatedListings));
    toast.success('Annonce publiée !');
  };

  const stats = calculateStats();

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-background p-4 pb-24">
        <div className="max-w-md mx-auto pt-8">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <img src={logo} alt="MeSéjours" className="h-12 mb-4" />
            <h1 className="font-display text-2xl font-bold text-foreground text-center">
              Bienvenue sur MeSéjours
            </h1>
            <p className="text-muted-foreground text-center mt-2">
              Connectez-vous pour accéder à toutes les fonctionnalités
            </p>
          </div>

          {/* Login Options */}
          <div className="space-y-4">
            <Card className="border-0 card-shadow">
              <CardContent className="p-6">
                <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Je suis un visiteur
                </h2>
                <p className="text-muted-foreground text-sm mb-4">
                  Découvrez les meilleurs restaurants, hébergements et attractions de Kinshasa.
                </p>
                <div className="space-y-2">
                  <Button 
                    className="w-full hero-gradient text-primary-foreground"
                    onClick={() => handleLogin('visitor')}
                  >
                    <LogIn className="h-4 w-4 mr-2" />
                    Se connecter
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => handleLogin('visitor')}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Créer un compte
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 card-shadow">
              <CardContent className="p-6">
                <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-accent" />
                  Je suis un propriétaire
                </h2>
                <p className="text-muted-foreground text-sm mb-4">
                  Gérez vos établissements et touchez plus de clients.
                </p>
                <div className="space-y-2">
                  <Button 
                    variant="secondary"
                    className="w-full"
                    onClick={() => handleLogin('owner')}
                  >
                    <LogIn className="h-4 w-4 mr-2" />
                    Espace propriétaire
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => handleLogin('owner')}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Devenir partenaire
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Help Link */}
          <div className="mt-8 text-center">
            <Button 
              variant="ghost" 
              className="text-muted-foreground"
              onClick={() => window.open('https://mesejours.com/contact', '_blank')}
            >
              <HelpCircle className="h-4 w-4 mr-2" />
              Besoin d'aide ?
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Logged in view
  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="max-w-md mx-auto">
        {/* Profile Header */}
        <Card className="border-0 card-shadow mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="h-16 w-16 rounded-full hero-gradient flex items-center justify-center">
                  {userType === 'owner' ? (
                    <Building2 className="h-8 w-8 text-primary-foreground" />
                  ) : (
                    <User className="h-8 w-8 text-primary-foreground" />
                  )}
                </div>
                <button 
                  className="absolute -bottom-1 -right-1 p-1.5 bg-primary rounded-full"
                  onClick={() => setShowEditProfile(true)}
                >
                  <Camera className="h-3 w-3 text-primary-foreground" />
                </button>
              </div>
              <div className="flex-1">
                <h2 className="font-display text-xl font-semibold text-foreground">
                  {userProfile.name || (userType === 'owner' ? 'Mon Établissement' : 'Utilisateur')}
                </h2>
                <p className="text-muted-foreground text-sm">
                  {userType === 'owner' ? 'Compte propriétaire' : 'Compte visiteur'}
                </p>
                {userProfile.email && (
                  <p className="text-xs text-muted-foreground">{userProfile.email}</p>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowEditProfile(true)}>
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats - for owners */}
        {userType === 'owner' && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <Card className="border-0 card-shadow">
              <CardContent className="p-4 text-center">
                <Eye className="h-5 w-5 text-primary mx-auto mb-1" />
                <p className="font-display text-2xl font-bold text-primary">{stats.views}</p>
                <p className="text-muted-foreground text-xs">Vues</p>
              </CardContent>
            </Card>
            <Card className="border-0 card-shadow">
              <CardContent className="p-4 text-center">
                <Heart className="h-5 w-5 text-primary mx-auto mb-1" />
                <p className="font-display text-2xl font-bold text-primary">{stats.favorites}</p>
                <p className="text-muted-foreground text-xs">Favoris</p>
              </CardContent>
            </Card>
            <Card className="border-0 card-shadow">
              <CardContent className="p-4 text-center">
                <Star className="h-5 w-5 text-yellow-500 mx-auto mb-1" />
                <p className="font-display text-2xl font-bold text-primary">{stats.rating || 'N/A'}</p>
                <p className="text-muted-foreground text-xs">Note</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Owner: My Listings & Create New */}
        {userType === 'owner' && (
          <Card className="border-0 card-shadow mb-6">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Mes annonces</CardTitle>
                <Button 
                  size="sm" 
                  className="hero-gradient"
                  onClick={() => setShowNewListingForm(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Nouvelle
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {userListings.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Aucune annonce pour le moment</p>
                  <Button 
                    variant="link" 
                    className="mt-2"
                    onClick={() => setShowNewListingForm(true)}
                  >
                    Créer votre première annonce
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {userListings.map((listing) => (
                    <div 
                      key={listing.id}
                      className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">{listing.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={
                            listing.status === 'published' ? 'default' : 
                            listing.status === 'pending' ? 'secondary' : 'outline'
                          } className="text-xs">
                            {listing.status === 'published' ? 'Publié' : 
                             listing.status === 'pending' ? 'En attente' : 'Brouillon'}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Eye className="h-3 w-3" /> {localStorage.getItem(`listing_views_${listing.id}`) || 0}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Heart className="h-3 w-3" /> {localStorage.getItem(`listing_fav_count_${listing.id}`) || 0}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {listing.status === 'pending' && (
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 text-green-600"
                            onClick={() => handlePublishListing(listing.id)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDeleteListing(listing.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Visitor: Favorites & History */}
        {userType === 'visitor' && (
          <Tabs defaultValue="favorites" className="mb-6">
            <TabsList className="w-full">
              <TabsTrigger value="favorites" className="flex-1">
                <Heart className="h-4 w-4 mr-2" />
                Favoris ({favorites.length})
              </TabsTrigger>
              <TabsTrigger value="history" className="flex-1">
                <Clock className="h-4 w-4 mr-2" />
                Historique
              </TabsTrigger>
            </TabsList>
            <TabsContent value="favorites">
              <Card className="border-0 card-shadow">
                <CardContent className="p-4">
                  {favorites.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <Heart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Aucun favori pour le moment</p>
                      <Button 
                        variant="link" 
                        className="mt-2"
                        onClick={() => navigate('/')}
                      >
                        Explorer les annonces
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {favorites.map((id) => (
                        <button
                          key={id}
                          onClick={() => navigate(`/detail/restaurant/${id}`)}
                          className="w-full flex items-center justify-between p-3 bg-secondary/50 rounded-lg hover:bg-secondary transition-colors"
                        >
                          <span className="font-medium">Annonce #{id}</span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="history">
              <Card className="border-0 card-shadow">
                <CardContent className="p-4">
                  {history.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Aucun historique</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {history.map((item, index) => (
                        <button
                          key={index}
                          onClick={() => navigate(`/detail/restaurant/${item.id}`)}
                          className="w-full flex items-center justify-between p-3 bg-secondary/50 rounded-lg hover:bg-secondary transition-colors"
                        >
                          <div className="text-left">
                            <p className="font-medium text-sm">{item.title}</p>
                            <p className="text-xs text-muted-foreground">{item.date}</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* Settings Menu */}
        <Card className="border-0 card-shadow mb-6">
          <CardContent className="p-0">
            <MenuItem 
              icon={Bell} 
              label="Notifications" 
              trailing={
                <Switch checked={notifications} onCheckedChange={setNotifications} />
              } 
            />
            <Separator />
            <MenuItem 
              icon={Shield} 
              label="Confidentialité" 
              onClick={() => window.open('https://mesejours.com/politique-de-confidentialite', '_blank')}
            />
            <Separator />
            <MenuItem 
              icon={HelpCircle} 
              label="Aide & Support" 
              onClick={() => window.open('https://mesejours.com/contact', '_blank')}
            />
            <Separator />
            <MenuItem 
              icon={Settings} 
              label="Paramètres" 
              onClick={() => setShowEditProfile(true)}
            />
          </CardContent>
        </Card>

        {/* Logout */}
        <Button 
          variant="outline" 
          className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Se déconnecter
        </Button>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={showEditProfile} onOpenChange={setShowEditProfile}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le profil</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nom</Label>
              <Input 
                id="name"
                value={userProfile.name}
                onChange={(e) => setUserProfile({...userProfile, name: e.target.value})}
                placeholder="Votre nom"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email"
                type="email"
                value={userProfile.email}
                onChange={(e) => setUserProfile({...userProfile, email: e.target.value})}
                placeholder="votre@email.com"
              />
            </div>
            <div>
              <Label htmlFor="phone">Téléphone</Label>
              <Input 
                id="phone"
                value={userProfile.phone}
                onChange={(e) => setUserProfile({...userProfile, phone: e.target.value})}
                placeholder="+243 ..."
              />
            </div>
            <div>
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input 
                id="whatsapp"
                value={userProfile.whatsapp}
                onChange={(e) => setUserProfile({...userProfile, whatsapp: e.target.value})}
                placeholder="+243 ..."
              />
            </div>
            <Button className="w-full hero-gradient" onClick={handleSaveProfile}>
              Enregistrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Listing Dialog */}
      <Dialog open={showNewListingForm} onOpenChange={setShowNewListingForm}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Créer une annonce</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="listing-title">Titre *</Label>
              <Input 
                id="listing-title"
                value={newListing.title}
                onChange={(e) => setNewListing({...newListing, title: e.target.value})}
                placeholder="Nom de votre établissement"
              />
            </div>
            <div>
              <Label htmlFor="listing-type">Type *</Label>
              <Select 
                value={newListing.type} 
                onValueChange={(value: 'restaurant' | 'sejour' | 'attraction') => 
                  setNewListing({...newListing, type: value})
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez un type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="restaurant">Restaurant</SelectItem>
                  <SelectItem value="sejour">Hébergement</SelectItem>
                  <SelectItem value="attraction">Attraction</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="listing-description">Description *</Label>
              <Textarea 
                id="listing-description"
                value={newListing.description}
                onChange={(e) => setNewListing({...newListing, description: e.target.value})}
                placeholder="Décrivez votre établissement..."
                rows={4}
              />
            </div>
            <div>
              <Label htmlFor="listing-address">Adresse</Label>
              <Input 
                id="listing-address"
                value={newListing.address}
                onChange={(e) => setNewListing({...newListing, address: e.target.value})}
                placeholder="Adresse complète"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="listing-phone">Téléphone</Label>
                <Input 
                  id="listing-phone"
                  value={newListing.phone}
                  onChange={(e) => setNewListing({...newListing, phone: e.target.value})}
                  placeholder="+243 ..."
                />
              </div>
              <div>
                <Label htmlFor="listing-whatsapp">WhatsApp</Label>
                <Input 
                  id="listing-whatsapp"
                  value={newListing.whatsapp}
                  onChange={(e) => setNewListing({...newListing, whatsapp: e.target.value})}
                  placeholder="+243 ..."
                />
              </div>
            </div>
            <div>
              <Label htmlFor="listing-price">Prix</Label>
              <Input 
                id="listing-price"
                value={newListing.price}
                onChange={(e) => setNewListing({...newListing, price: e.target.value})}
                placeholder="ex: 50$ / nuit"
              />
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setShowNewListingForm(false)}
              >
                Annuler
              </Button>
              <Button 
                className="flex-1 hero-gradient"
                onClick={handleCreateListing}
              >
                Créer l'annonce
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface MenuItemProps {
  icon: React.ElementType;
  label: string;
  trailing?: React.ReactNode;
  onClick?: () => void;
}

function MenuItem({ icon: Icon, label, trailing, onClick }: MenuItemProps) {
  return (
    <button 
      className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-primary" />
        <span className="text-foreground">{label}</span>
      </div>
      {trailing || <ChevronRight className="h-5 w-5 text-muted-foreground" />}
    </button>
  );
}
