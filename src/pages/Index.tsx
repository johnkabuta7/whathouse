import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { ArrowRight, Utensils, Home, Compass, BookOpen, MapPin, Star, Users, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ListingCard } from '@/components/ListingCard';
import { PostCard } from '@/components/PostCard';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { HorizontalScroll } from '@/components/HorizontalScroll';
import { CategoryIcon } from '@/components/CategoryIcon';
import { SearchBar } from '@/components/SearchBar';
import { fetchListings, fetchPosts, searchListings, LISTING_CATEGORIES, POST_CATEGORIES } from '@/lib/api';

const features = [
  {
    icon: Utensils,
    label: 'Restaurants',
    link: '/restaurants',
  },
  {
    icon: Home,
    label: 'Séjours',
    link: '/sejours',
  },
  {
    icon: Compass,
    label: 'Attractions',
    link: '/attractions',
  },
  {
    icon: BookOpen,
    label: 'Conseils',
    link: '/conseils',
  },
];

const stats = [
  { icon: MapPin, value: '300+', label: 'Lieux' },
  { icon: Star, value: '4.8', label: 'Note' },
  { icon: Users, value: '10K+', label: 'Visiteurs' },
];

export default function Index() {
  const navigate = useNavigate();
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const { data: restaurantsData, isLoading: loadingRestaurants } = useQuery({
    queryKey: ['restaurants', 'featured'],
    queryFn: () => fetchListings(LISTING_CATEGORIES.RESTAURANTS, 8),
  });

  const { data: sejoursData, isLoading: loadingSejours } = useQuery({
    queryKey: ['sejours', 'featured'],
    queryFn: () => fetchListings(LISTING_CATEGORIES.SEJOURS, 8),
  });

  const { data: conseilsData, isLoading: loadingConseils } = useQuery({
    queryKey: ['conseils', 'featured'],
    queryFn: () => fetchPosts(POST_CATEGORIES.CONSEILS, 6),
  });

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }
    setIsSearching(true);
    try {
      const results = await searchListings(query);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
    }
    setIsSearching(false);
  };

  const handleLocationClick = (coords: { lat: number; lng: number }) => {
    // Navigate to restaurants with location
    navigate(`/restaurants?lat=${coords.lat}&lng=${coords.lng}`);
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section - Compact for mobile */}
      <section className="relative hero-gradient py-8 md:py-16 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1920&q=80')] bg-cover bg-center opacity-20" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="font-display text-2xl md:text-4xl font-bold text-primary-foreground mb-3 animate-fade-in">
              Découvrez Kinshasa
            </h1>
            <p className="text-sm md:text-lg text-primary-foreground/90 mb-6">
              Restaurants, hébergements et attractions pour un séjour inoubliable.
            </p>
            
            {/* Search Bar */}
            <div className="bg-card/95 backdrop-blur-sm rounded-2xl p-4 shadow-lg">
              <SearchBar
                placeholder="Rechercher partout..."
                onSearch={handleSearch}
                onLocationClick={handleLocationClick}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Search Results */}
      {(searchResults || isSearching) && (
        <section className="py-6 bg-background">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold text-foreground">
                Résultats de recherche
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setSearchResults(null)}>
                Effacer
              </Button>
            </div>
            {isSearching ? (
              <LoadingSpinner text="Recherche..." />
            ) : searchResults && searchResults.length > 0 ? (
              <HorizontalScroll>
                {searchResults.map((listing) => (
                  <div key={listing.id} className="w-64 shrink-0">
                    <ListingCard listing={listing} type="restaurant" />
                  </div>
                ))}
              </HorizontalScroll>
            ) : (
              <p className="text-muted-foreground text-center py-8">Aucun résultat trouvé</p>
            )}
          </div>
        </section>
      )}

      {/* Stats Section - Compact */}
      <section className="bg-card py-4 border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex justify-center gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="flex items-center gap-2">
                <div className="bg-primary/10 rounded-full p-2">
                  <stat.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-display text-lg font-bold text-foreground">{stat.value}</p>
                  <p className="text-muted-foreground text-xs">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories - Icons only with horizontal scroll */}
      <section className="py-6 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-lg font-bold text-foreground mb-4">
            Explorez par catégorie
          </h2>
          <div className="flex justify-around md:justify-center md:gap-12">
            {features.map((feature) => (
              <CategoryIcon
                key={feature.label}
                icon={feature.icon}
                label={feature.label}
                link={feature.link}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Featured Restaurants - Horizontal Scroll */}
      <section className="py-6 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-bold text-foreground">
              Restaurants populaires
            </h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/restaurants" className="text-primary">
                Voir tout
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
          {loadingRestaurants ? (
            <LoadingSpinner />
          ) : (
            <HorizontalScroll>
              {restaurantsData?.listings.map((listing) => (
                <div key={listing.id} className="w-64 shrink-0">
                  <ListingCard listing={listing} type="restaurant" />
                </div>
              ))}
            </HorizontalScroll>
          )}
        </div>
      </section>

      {/* Featured Accommodations - Horizontal Scroll */}
      <section className="py-6 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-bold text-foreground">
              Hébergements recommandés
            </h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/sejours" className="text-primary">
                Voir tout
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
          {loadingSejours ? (
            <LoadingSpinner />
          ) : (
            <HorizontalScroll>
              {sejoursData?.listings.map((listing) => (
                <div key={listing.id} className="w-64 shrink-0">
                  <ListingCard listing={listing} type="sejour" />
                </div>
              ))}
            </HorizontalScroll>
          )}
        </div>
      </section>

      {/* Latest Blog Posts - Horizontal Scroll */}
      <section className="py-6 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-bold text-foreground">
              Conseils aux voyageurs
            </h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/conseils" className="text-primary">
                Voir tout
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
          {loadingConseils ? (
            <LoadingSpinner />
          ) : (
            <HorizontalScroll>
              {conseilsData?.posts.map((post) => (
                <div key={post.id} className="w-72 shrink-0">
                  <PostCard post={post} />
                </div>
              ))}
            </HorizontalScroll>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-8 hero-gradient">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-display text-xl md:text-2xl font-bold text-primary-foreground mb-3">
            Prêt à découvrir Kinshasa ?
          </h2>
          <Button size="lg" variant="secondary" asChild>
            <Link to="/attractions">
              Découvrir les attractions
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
