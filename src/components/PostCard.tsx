import { Link } from 'react-router-dom';
import { Calendar, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { WPPost } from '@/lib/api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PostCardProps {
  post: WPPost;
}

const placeholderImage = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400&h=300&fit=crop';

export function PostCard({ post }: PostCardProps) {
  const imageUrl = post.featuredImageUrl || placeholderImage;
  
  // Decode HTML entities
  const decodeHtml = (html: string) => {
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
  };

  const title = decodeHtml(post.title.rendered);
  
  // Strip HTML from excerpt
  const stripHtml = (html: string) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };
  
  const excerpt = stripHtml(post.excerpt.rendered).slice(0, 100) + '...';
  const formattedDate = format(new Date(post.date), 'd MMM yyyy', { locale: fr });

  return (
    <Link to={`/conseil/${post.id}`}>
      <Card className="group overflow-hidden border-0 card-shadow hover:card-hover-shadow transition-all duration-300">
        <div className="relative overflow-hidden aspect-[16/9]">
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />
        </div>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
            <Calendar className="h-3 w-3" />
            <span>{formattedDate}</span>
          </div>
          <h3 className="font-display text-base font-semibold text-foreground mb-2 line-clamp-2">
            {title}
          </h3>
          <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
            {excerpt}
          </p>
          <div className="flex items-center gap-1 text-primary text-sm font-medium">
            <span>Lire l'article</span>
            <ChevronRight className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
