import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { PostCard } from '@/components/PostCard';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { fetchPosts, POST_CATEGORIES } from '@/lib/api';

export default function Conseils() {
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ['conseils', page],
    queryFn: () => fetchPosts(POST_CATEGORIES.CONSEILS, 9, page),
  });

  return (
    <div>
      <PageHeader
        title="Conseils aux voyageurs"
        description="Nos guides pratiques et conseils pour préparer votre voyage et profiter pleinement de votre séjour."
      />

      <div className="container mx-auto px-4 lg:px-8 py-8">
        {/* Results */}
        {isLoading ? (
          <LoadingSpinner text="Chargement des articles..." />
        ) : error ? (
          <EmptyState
            title="Erreur de chargement"
            description="Impossible de charger les articles. Veuillez réessayer."
          />
        ) : data?.posts.length === 0 ? (
          <EmptyState
            title="Aucun article trouvé"
            description="Aucun article disponible pour le moment."
          />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data?.posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>

            {/* Pagination */}
            {data && data.totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-12">
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Précédent
                </Button>
                <span className="flex items-center px-4 text-muted-foreground">
                  Page {page} sur {data.totalPages}
                </span>
                <Button
                  variant="outline"
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
