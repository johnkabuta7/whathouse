import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { 
  ArrowLeft, MapPin, Share2, Heart, Phone, Mail, Globe, 
  MessageCircle, Facebook, Instagram, Twitter, Calendar,
  Clock, DollarSign, Star, ChevronLeft, ChevronRight, X,
  Wifi, Car, Coffee, Utensils, Tv, Wind, ShowerHead, Bath,
  Bed, Users, Home, Key, Sparkles, Shield, Check, Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { fetchListingById, fetchListingFeatures, getListingContact, WPCategory } from '@/lib/api';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const placeholderImages = {
  restaurant: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80',
  sejour: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
  attraction: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80',
};

// Feature icon mapping
const featureIcons: Record<string, React.ElementType> = {
  'wifi': Wifi,
  'parking': Car,
  'petit-déjeuner': Coffee,
  'restaurant': Utensils,
  'télévision': Tv,
  'climatisation': Wind,
  'douche': ShowerHead,
  'baignoire': Bath,
  'lit': Bed,
  'famille': Users,
  'maison': Home,
  'clé': Key,
  'propre': Sparkles,
  'sécurité': Shield,
  'default': Check
};

const getFeatureIcon = (featureName: string): React.ElementType => {
  const name = featureName.toLowerCase();
  for (const [key, icon] of Object.entries(featureIcons)) {
    if (name.includes(key)) return icon;
  }
  return featureIcons.default;
};

export default function ListingDetail() {
  const { id, type } = useParams<{ id: string; type: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [showCalendar, setShowCalendar] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);

  // Get favorites and views from localStorage
  const [isFavorite, setIsFavorite] = useState(false);
  const [viewCount, setViewCount] = useState(0);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);

  const { data: listing, isLoading, error } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => fetchListingById(Number(id)),
    enabled: !!id,
  });

  const { data: allFeatures = [] } = useQuery({
    queryKey: ['listingFeatures'],
    queryFn: fetchListingFeatures,
  });

  // Track view on mount
  useEffect(() => {
    if (id) {
      const viewsKey = `listing_views_${id}`;
      const currentViews = parseInt(localStorage.getItem(viewsKey) || '0');
      const newViews = currentViews + 1;
      localStorage.setItem(viewsKey, String(newViews));
      setViewCount(newViews);

      // Load favorite count
      const favCountKey = `listing_fav_count_${id}`;
      setFavoriteCount(parseInt(localStorage.getItem(favCountKey) || '0'));

      // Check if user has favorited
      const favorites = JSON.parse(localStorage.getItem('user_favorites') || '[]');
      setIsFavorite(favorites.includes(Number(id)));

      // Load ratings
      const ratingsKey = `listing_ratings_${id}`;
      const ratings = JSON.parse(localStorage.getItem(ratingsKey) || '[]');
      if (ratings.length > 0) {
        const avg = ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length;
        setAverageRating(Math.round(avg * 10) / 10);
        setRatingCount(ratings.length);
      }

      // Check if user has rated
      const userRatingKey = `user_rating_${id}`;
      const savedRating = localStorage.getItem(userRatingKey);
      if (savedRating) setUserRating(parseInt(savedRating));
    }
  }, [id]);

  const decodeHtml = (html: string) => {
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
  };

  const handleShare = async () => {
    if (navigator.share && listing) {
      try {
        await navigator.share({
          title: decodeHtml(listing.title.rendered),
          url: window.location.href,
        });
      } catch {
        // User cancelled sharing
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Lien copié !');
    }
  };

  const toggleFavorite = () => {
    if (!id) return;
    const favorites = JSON.parse(localStorage.getItem('user_favorites') || '[]');
    const listingId = Number(id);
    let newFavorites: number[];
    let newCount: number;
    
    if (favorites.includes(listingId)) {
      newFavorites = favorites.filter((f: number) => f !== listingId);
      newCount = Math.max(0, favoriteCount - 1);
      toast.info('Retiré des favoris');
    } else {
      newFavorites = [...favorites, listingId];
      newCount = favoriteCount + 1;
      toast.success('Ajouté aux favoris !');
    }
    
    localStorage.setItem('user_favorites', JSON.stringify(newFavorites));
    localStorage.setItem(`listing_fav_count_${id}`, String(newCount));
    setIsFavorite(!isFavorite);
    setFavoriteCount(newCount);
  };

  const handleRating = (rating: number) => {
    if (!id) return;
    
    const ratingsKey = `listing_ratings_${id}`;
    const userRatingKey = `user_rating_${id}`;
    
    // Get existing ratings
    let ratings = JSON.parse(localStorage.getItem(ratingsKey) || '[]');
    
    // If user already rated, update their rating
    const existingRating = localStorage.getItem(userRatingKey);
    if (existingRating) {
      const oldRating = parseInt(existingRating);
      ratings = ratings.filter((r: number) => r !== oldRating);
    }
    
    ratings.push(rating);
    localStorage.setItem(ratingsKey, JSON.stringify(ratings));
    localStorage.setItem(userRatingKey, String(rating));
    
    const avg = ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length;
    setAverageRating(Math.round(avg * 10) / 10);
    setRatingCount(ratings.length);
    setUserRating(rating);
    toast.success(`Vous avez donné ${rating} étoile${rating > 1 ? 's' : ''} !`);
  };

  const handleCall = (phone: string) => {
    if (phone) {
      window.location.href = `tel:${phone}`;
    } else {
      toast.error('Numéro non disponible');
    }
  };

  const handleWhatsApp = (whatsapp: string) => {
    if (whatsapp) {
      const cleanNumber = whatsapp.replace(/[^0-9+]/g, '');
      window.open(`https://wa.me/${cleanNumber}`, '_blank');
    } else {
      toast.error('WhatsApp non disponible');
    }
  };

  const handleEmail = (email: string) => {
    if (email) {
      window.location.href = `mailto:${email}`;
    } else {
      toast.error('Email non disponible');
    }
  };

  const handleWebsite = (website: string) => {
    if (website) {
      window.open(website.startsWith('http') ? website : `https://${website}`, '_blank');
    } else {
      toast.error('Site web non disponible');
    }
  };

  const handleSocial = (url: string) => {
    if (url) {
      window.open(url.startsWith('http') ? url : `https://${url}`, '_blank');
    }
  };

  const handleReservation = () => {
    if (!selectedDate) {
      toast.error('Veuillez sélectionner une date');
      return;
    }
    const message = `Bonjour, je souhaite réserver pour le ${selectedDate.toLocaleDateString('fr-FR')}. ${listing ? decodeHtml(listing.title.rendered) : ''}`;
    const whatsapp = contact.whatsapp || contact.phone;
    if (whatsapp) {
      const cleanNumber = whatsapp.replace(/[^0-9+]/g, '');
      window.open(`https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`, '_blank');
      setShowCalendar(false);
    } else {
      toast.error('Contact non disponible');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-muted-foreground mb-4">Impossible de charger les détails</p>
        <Button onClick={() => navigate(-1)}>Retour</Button>
      </div>
    );
  }

  const contact = getListingContact(listing);
  const imageUrl = listing.featuredImageUrl || placeholderImages[type as keyof typeof placeholderImages] || placeholderImages.attraction;
  const title = decodeHtml(listing.title.rendered);
  
  // Build gallery array from all available sources
  const gallery = [
    { url: imageUrl, alt: title },
    ...(listing.acf?.gallery || [])
  ];

  // Get feature names from IDs with icons
  const featureNames = listing.listing_feature
    ?.map(fId => allFeatures.find((f: WPCategory) => f.id === fId)?.name)
    .filter(Boolean) || [];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Hero Image with Gallery */}
      <div className="relative h-64 md:h-80">
        <img
          src={gallery[galleryIndex]?.url || imageUrl}
          alt={title}
          className="w-full h-full object-cover cursor-pointer"
          onClick={() => setShowGallery(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        
        {/* Top Actions */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <Button
            variant="secondary"
            size="icon"
            className="rounded-full bg-card/80 backdrop-blur-sm"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="icon"
              className="rounded-full bg-card/80 backdrop-blur-sm"
              onClick={handleShare}
            >
              <Share2 className="h-5 w-5" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className={cn(
                "rounded-full bg-card/80 backdrop-blur-sm",
                isFavorite && "text-primary"
              )}
              onClick={toggleFavorite}
            >
              <Heart className={cn("h-5 w-5", isFavorite && "fill-current")} />
            </Button>
          </div>
        </div>

        {/* Gallery Navigation on Hero */}
        {gallery.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-card/50 backdrop-blur-sm rounded-full"
              onClick={(e) => { e.stopPropagation(); setGalleryIndex(i => i === 0 ? gallery.length - 1 : i - 1); }}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-card/50 backdrop-blur-sm rounded-full"
              onClick={(e) => { e.stopPropagation(); setGalleryIndex(i => i === gallery.length - 1 ? 0 : i + 1); }}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </>
        )}

        {/* Badge */}
        <Badge className="absolute bottom-4 left-4 bg-primary text-primary-foreground">
          {type === 'restaurant' ? 'Restaurant' : type === 'sejour' ? 'Hébergement' : 'Attraction'}
        </Badge>

        {/* Gallery indicator */}
        {gallery.length > 1 && (
          <div className="absolute bottom-4 right-4 bg-card/80 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-medium">
            {galleryIndex + 1}/{gallery.length} photos
          </div>
        )}
      </div>

      {/* Gallery Thumbnails */}
      {gallery.length > 1 && (
        <div className="flex gap-2 px-4 py-3 overflow-x-auto">
          {gallery.map((img, i) => (
            <button
              key={i}
              onClick={() => setGalleryIndex(i)}
              className={cn(
                "flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all",
                i === galleryIndex ? "border-primary" : "border-transparent opacity-60"
              )}
            >
              <img src={img.url} alt={img.alt || `Photo ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="p-4 md:p-6 -mt-2 relative z-10">
        <div className="bg-card rounded-t-3xl p-6 card-shadow">
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-3">
            {title}
          </h1>

          <div className="flex items-center gap-2 text-muted-foreground mb-3">
            <MapPin className="h-4 w-4 text-primary" />
            <span>{contact.address || 'Kinshasa, RDC'}</span>
          </div>

          {/* Stats Row */}
          <div className="flex items-center gap-4 mb-4 text-sm">
            <div className="flex items-center gap-1">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <span>{viewCount} vues</span>
            </div>
            <div className="flex items-center gap-1">
              <Heart className="h-4 w-4 text-primary" />
              <span>{favoriteCount} favoris</span>
            </div>
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              <span>{averageRating || 'N/A'} ({ratingCount} avis)</span>
            </div>
          </div>

          {/* Rating Section */}
          <div className="mb-4">
            <p className="text-sm text-muted-foreground mb-2">Votre note :</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star 
                    className={cn(
                      "h-6 w-6",
                      (hoverRating || userRating) >= star 
                        ? "text-yellow-500 fill-yellow-500" 
                        : "text-muted-foreground"
                    )} 
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Quick Contact Actions */}
          <div className="grid grid-cols-4 gap-2 mb-6">
            <Button 
              size="sm"
              className="flex-col h-auto py-3 hero-gradient text-primary-foreground"
              onClick={() => handleCall(contact.phone)}
            >
              <Phone className="h-5 w-5 mb-1" />
              <span className="text-xs">Appeler</span>
            </Button>
            <Button 
              size="sm"
              variant="outline"
              className="flex-col h-auto py-3 border-green-500 text-green-600 hover:bg-green-50"
              onClick={() => handleWhatsApp(contact.whatsapp)}
            >
              <MessageCircle className="h-5 w-5 mb-1" />
              <span className="text-xs">WhatsApp</span>
            </Button>
            <Button 
              size="sm"
              variant="outline"
              className="flex-col h-auto py-3"
              onClick={() => handleEmail(contact.email)}
            >
              <Mail className="h-5 w-5 mb-1" />
              <span className="text-xs">Email</span>
            </Button>
            <Button 
              size="sm"
              variant="outline"
              className="flex-col h-auto py-3"
              onClick={() => handleWebsite(contact.website)}
            >
              <Globe className="h-5 w-5 mb-1" />
              <span className="text-xs">Site</span>
            </Button>
          </div>

          {/* Social Media */}
          {(contact.facebook || contact.instagram || contact.twitter) && (
            <div className="flex gap-3 mb-6">
              {contact.facebook && (
                <Button 
                  variant="outline" 
                  size="icon"
                  className="rounded-full"
                  onClick={() => handleSocial(contact.facebook)}
                >
                  <Facebook className="h-4 w-4 text-blue-600" />
                </Button>
              )}
              {contact.instagram && (
                <Button 
                  variant="outline" 
                  size="icon"
                  className="rounded-full"
                  onClick={() => handleSocial(contact.instagram)}
                >
                  <Instagram className="h-4 w-4 text-pink-600" />
                </Button>
              )}
              {contact.twitter && (
                <Button 
                  variant="outline" 
                  size="icon"
                  className="rounded-full"
                  onClick={() => handleSocial(contact.twitter)}
                >
                  <Twitter className="h-4 w-4 text-blue-400" />
                </Button>
              )}
            </div>
          )}

          <Separator className="my-6" />

          {/* Tarification / Prix */}
          {contact.price && (
            <>
              <h2 className="font-display text-lg font-semibold mb-3 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Tarification
              </h2>
              <Card className="mb-6 border-primary/20 bg-primary/5">
                <CardContent className="p-4">
                  <p className="text-2xl font-bold text-primary">{contact.price}</p>
                  <p className="text-sm text-muted-foreground">
                    {type === 'sejour' ? 'par nuit' : type === 'restaurant' ? 'prix moyen' : ''}
                  </p>
                </CardContent>
              </Card>
            </>
          )}

          {/* Reservation Button (for accommodations) */}
          {type === 'sejour' && (
            <>
              <Button 
                className="w-full hero-gradient text-primary-foreground mb-4"
                size="lg"
                onClick={() => setShowCalendar(true)}
              >
                <Calendar className="h-5 w-5 mr-2" />
                Réserver maintenant
              </Button>

              {(listing.acf?.check_in || listing.acf?.check_out) && (
                <div className="flex gap-4 mb-6 text-sm text-muted-foreground">
                  {listing.acf?.check_in && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>Arrivée: {listing.acf.check_in}</span>
                    </div>
                  )}
                  {listing.acf?.check_out && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>Départ: {listing.acf.check_out}</span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Opening Hours */}
          {listing.acf?.opening_hours && (
            <>
              <h2 className="font-display text-lg font-semibold mb-3 flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Horaires d'ouverture
              </h2>
              <p className="text-muted-foreground mb-6">{listing.acf.opening_hours}</p>
            </>
          )}

          <Separator className="my-6" />

          {/* Description */}
          <h2 className="font-display text-lg font-semibold mb-3">Description</h2>
          <div 
            className="prose prose-sm max-w-none text-muted-foreground leading-relaxed mb-6"
            dangerouslySetInnerHTML={{ __html: listing.content.rendered }}
          />

          {/* Features/Amenities - NOW AFTER DESCRIPTION */}
          {featureNames.length > 0 && (
            <>
              <Separator className="my-6" />
              <h2 className="font-display text-lg font-semibold mb-4">Caractéristiques</h2>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {featureNames.map((feature, index) => {
                  const IconComponent = getFeatureIcon(feature as string);
                  return (
                    <div 
                      key={index} 
                      className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg"
                    >
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <IconComponent className="h-4 w-4 text-primary" />
                      </div>
                      <span className="text-sm font-medium">{feature}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Map */}
          {(contact.latitude && contact.longitude) && (
            <>
              <Separator className="my-6" />
              <h2 className="font-display text-lg font-semibold mb-3 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Localisation
              </h2>
              <Card className="overflow-hidden">
                <iframe
                  width="100%"
                  height="200"
                  style={{ border: 0 }}
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${contact.latitude},${contact.longitude}&zoom=15`}
                />
              </Card>
              <Button 
                variant="outline" 
                className="w-full mt-3"
                onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${contact.latitude},${contact.longitude}`, '_blank')}
              >
                <MapPin className="h-4 w-4 mr-2" />
                Obtenir l'itinéraire
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Gallery Modal */}
      <Dialog open={showGallery} onOpenChange={setShowGallery}>
        <DialogContent className="max-w-4xl p-0 bg-black/95">
          <DialogTitle className="sr-only">Galerie photos</DialogTitle>
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-white z-10"
              onClick={() => setShowGallery(false)}
            >
              <X className="h-6 w-6" />
            </Button>
            
            <img
              src={gallery[galleryIndex]?.url}
              alt={gallery[galleryIndex]?.alt || title}
              className="w-full h-[70vh] object-contain"
            />
            
            {gallery.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white"
                  onClick={() => setGalleryIndex(i => i === 0 ? gallery.length - 1 : i - 1)}
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white"
                  onClick={() => setGalleryIndex(i => i === gallery.length - 1 ? 0 : i + 1)}
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
                
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {gallery.map((_, i) => (
                    <button
                      key={i}
                      className={cn(
                        "w-2 h-2 rounded-full transition-colors",
                        i === galleryIndex ? "bg-white" : "bg-white/50"
                      )}
                      onClick={() => setGalleryIndex(i)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Calendar Modal for reservations */}
      <Dialog open={showCalendar} onOpenChange={setShowCalendar}>
        <DialogContent>
          <DialogTitle className="font-display text-xl">Sélectionnez une date</DialogTitle>
          <div className="flex justify-center">
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) => date < new Date()}
              className={cn("p-3 pointer-events-auto")}
            />
          </div>
          {selectedDate && (
            <div className="mt-4">
              <p className="text-center text-muted-foreground mb-4">
                Date sélectionnée: <strong>{selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>
              </p>
              {contact.price && (
                <p className="text-center text-lg font-semibold text-primary mb-4">
                  Prix: {contact.price}
                </p>
              )}
              <Button 
                className="w-full hero-gradient"
                onClick={handleReservation}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Confirmer la réservation via WhatsApp
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
