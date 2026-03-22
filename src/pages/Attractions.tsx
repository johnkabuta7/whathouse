import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { ListingCard } from '@/components/ListingCard';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { SearchBar } from '@/components/SearchBar';
import { Button } from '@/components/ui/button';
import { fetchListings, searchListings, LISTING_CATEGORIES } from '@/lib/api';

export default function Attractions() {
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['attractions', page],
    queryFn: () => fetchListings(LISTING_CATEGORIES.ATTRACTIONS, 12, page),
  });

  // Search results
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['searchAttractions', searchQuery],
    queryFn: () => searchListings(searchQuery, LISTING_CATEGORIES.ATTRACTIONS),
    enabled: searchQuery.length > 2,
  });

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleLocationClick = (coords: { lat: number; lng: number }) => {
    // Open Google Maps with attractions nearby
    window.open(`https://www.google.com/maps/search/attractions/@${coords.lat},${coords.lng},14z`, '_blank');
  };

  const displayListings = searchQuery && searchResults ? searchResults : data?.listings || [];

  return (
    <div>
      <PageHeader
        title="Attractions"
        description="Explorez les sites touristiques et lieux emblématiques"
      />

      <div className="container mx-auto px-4 py-4">
        {/* Search Bar */}
        <div className="mb-6">
          <SearchBar
            placeholder="Rechercher une attraction..."
            onSearch={handleSearch}
            onLocationClick={handleLocationClick}
          />
        </div>

        {/* Results */}
        {isLoading || isSearching ? (
          <LoadingSpinner text="Chargement des attractions..." />
        ) : error ? (
          <EmptyState
            title="Erreur de chargement"
            description="Impossible de charger les attractions. Veuillez réessayer."
          />
        ) : displayListings.length === 0 ? (
          <EmptyState
            title="Aucune attraction trouvée"
            description="Essayez une autre recherche."
          />
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {displayListings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} type="attraction" />
              ))}
            </div>

            {/* Pagination */}
            {data && data.totalPages > 1 && !searchQuery && (
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
