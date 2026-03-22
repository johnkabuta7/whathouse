import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { ListingCard } from '@/components/ListingCard';
import { CategoryFilter } from '@/components/CategoryFilter';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { SearchBar } from '@/components/SearchBar';
import { Button } from '@/components/ui/button';
import {
  fetchListings,
  fetchServiceCategories,
  fetchListingsByServiceCategory,
  searchListings,
  calculateDistance,
  LISTING_CATEGORIES,
  WPListing,
} from '@/lib/api';

export default function Restaurants() {
  const [searchParams] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [filteredByLocation, setFilteredByLocation] = useState<WPListing[] | null>(null);

  // Check for location params from Index page
  useEffect(() => {
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    if (lat && lng) {
      setUserLocation({ lat: parseFloat(lat), lng: parseFloat(lng) });
    }
  }, [searchParams]);

  // Fetch service categories (cuisine types)
  const { data: categories = [] } = useQuery({
    queryKey: ['serviceCategories'],
    queryFn: fetchServiceCategories,
  });

  // Fetch all restaurants or filtered by category
  const { data, isLoading, error } = useQuery({
    queryKey: ['restaurants', selectedCategory, page],
    queryFn: async () => {
      if (selectedCategory) {
        const listings = await fetchListingsByServiceCategory(
          LISTING_CATEGORIES.RESTAURANTS,
          selectedCategory,
          12
        );
        return { listings, total: listings.length, totalPages: 1 };
      }
      return fetchListings(LISTING_CATEGORIES.RESTAURANTS, 12, page);
    },
  });

  // Search results
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['searchRestaurants', searchQuery],
    queryFn: () => searchListings(searchQuery, LISTING_CATEGORIES.RESTAURANTS),
    enabled: searchQuery.length > 2,
  });

  // Filter by location when userLocation is set
  useEffect(() => {
    if (userLocation && data?.listings) {
      const sorted = [...data.listings]
        .filter(listing => {
          const lat = listing.acf?.latitude || listing.meta?._geolocation_lat;
          const lng = listing.acf?.longitude || listing.meta?._geolocation_long;
          return lat && lng;
        })
        .map(listing => {
          const lat = parseFloat(listing.acf?.latitude || listing.meta?._geolocation_lat || '0');
          const lng = parseFloat(listing.acf?.longitude || listing.meta?._geolocation_long || '0');
          const distance = calculateDistance(userLocation.lat, userLocation.lng, lat, lng);
          return { ...listing, distance };
        })
        .sort((a, b) => (a.distance || 999) - (b.distance || 999));
      
      setFilteredByLocation(sorted);
    } else {
      setFilteredByLocation(null);
    }
  }, [userLocation, data?.listings]);

  const handleCategoryChange = (id: number | null) => {
    setSelectedCategory(id);
    setPage(1);
    setSearchQuery('');
    setUserLocation(null);
    setFilteredByLocation(null);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setUserLocation(null);
    setFilteredByLocation(null);
  };

  const handleLocationClick = (coords: { lat: number; lng: number }) => {
    setUserLocation(coords);
    setSearchQuery('');
  };

  const displayListings = searchQuery && searchResults 
    ? searchResults 
    : filteredByLocation 
      ? filteredByLocation 
      : data?.listings || [];

  return (
    <div>
      <PageHeader
        title="Restaurants"
        description="Découvrez les meilleures adresses culinaires de Kinshasa"
      />

      <div className="container mx-auto px-4 py-4">
        {/* Search Bar */}
        <div className="mb-6">
          <SearchBar
            placeholder="Rechercher un restaurant..."
            onSearch={handleSearch}
            onLocationClick={handleLocationClick}
          />
        </div>

        {userLocation && (
          <div className="mb-4 flex items-center justify-between bg-primary/10 rounded-lg p-3">
            <span className="text-sm text-foreground">
              📍 Affichage des restaurants à proximité
            </span>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => { setUserLocation(null); setFilteredByLocation(null); }}
            >
              Effacer
            </Button>
          </div>
        )}

        {/* Category Filter */}
        <div className="mb-6">
          <h2 className="font-display text-sm font-semibold text-foreground mb-3">
            Type de cuisine
          </h2>
          <CategoryFilter
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={handleCategoryChange}
            allLabel="Toutes"
          />
        </div>

        {/* Results */}
        {isLoading || isSearching ? (
          <LoadingSpinner text="Chargement des restaurants..." />
        ) : error ? (
          <EmptyState
            title="Erreur de chargement"
            description="Impossible de charger les restaurants. Veuillez réessayer."
          />
        ) : displayListings.length === 0 ? (
          <EmptyState
            title="Aucun restaurant trouvé"
            description="Essayez une autre recherche ou catégorie."
          />
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {displayListings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} type="restaurant" />
              ))}
            </div>

            {/* Pagination */}
            {data && data.totalPages > 1 && !selectedCategory && !searchQuery && !filteredByLocation && (
              <div className="flex justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Précédent
                </Button>
                <span className="flex items-center px-4 text-muted-foreground text-sm">
                  {page}/{data.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                  disabled={page === data.totalPages}
                >
                  Suivant
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
