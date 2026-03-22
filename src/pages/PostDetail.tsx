import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Share2, Calendar, Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { fetchPostById } from '@/lib/api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const placeholderImage = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&q=80';

export default function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: post, isLoading, error } = useQuery({
    queryKey: ['post', id],
    queryFn: () => fetchPostById(Number(id)),
    enabled: !!id,
  });

  const decodeHtml = (html: string) => {
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
  };

  const handleShare = async () => {
    if (navigator.share && post) {
      try {
        await navigator.share({
          title: decodeHtml(post.title.rendered),
          url: window.location.href,
        });
      } catch {
        // User cancelled sharing
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-muted-foreground mb-4">Impossible de charger l'article</p>
        <Button onClick={() => navigate(-1)}>Retour</Button>
      </div>
    );
  }

  const imageUrl = post.featuredImageUrl || placeholderImage;
  const title = decodeHtml(post.title.rendered);
  const formattedDate = format(new Date(post.date), 'd MMMM yyyy', { locale: fr });

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Image */}
      <div className="relative h-56 md:h-72">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover"
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
              className="rounded-full bg-card/80 backdrop-blur-sm"
            >
              <Bookmark className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 md:p-6 -mt-6 relative z-10">
        <div className="bg-card rounded-t-3xl p-6 card-shadow">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-3">
            <Calendar className="h-4 w-4" />
            <span>{formattedDate}</span>
          </div>

          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-6">
            {title}
          </h1>

          {/* Article Content */}
          <div 
            className="prose prose-sm max-w-none text-foreground prose-headings:font-display prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-primary"
            dangerouslySetInnerHTML={{ __html: post.content.rendered }}
          />
        </div>
      </div>
    </div>
  );
}
