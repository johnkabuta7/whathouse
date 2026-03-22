import { Link } from 'react-router-dom';
import { MapPin, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { WPListing } from '@/lib/api';

interface ListingCardProps {
  listing: WPListing;
  type: 'restaurant' | 'sejour' | 'attraction';
}

const placeholderImages = {
  restaurant: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop',
  sejour: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop',
  attraction: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=300&fit=crop',
};

export function ListingCard({ listing, type }: ListingCardProps) {
  const imageUrl = listing.featuredImageUrl || placeholderImages[type];
  
  // Decode HTML entities in title
  const decodeHtml = (html: string) => {
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
  };

  const title = decodeHtml(listing.title.rendered);
  
  // Strip HTML from content for preview
  const stripHtml = (html: string) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };
  
  const excerpt = stripHtml(listing.content.rendered).slice(0, 80) + '...';

  return (
    <Link to={`/detail/${type}/${listing.id}`}>
      <Card className="group overflow-hidden border-0 card-shadow hover:card-hover-shadow transition-all duration-300">
        <div className="relative overflow-hidden aspect-[4/3]">
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />
          <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground border-0">
            {type === 'restaurant' ? 'Restaurant' : type === 'sejour' ? 'Hébergement' : 'Attraction'}
          </Badge>
        </div>
        <CardContent className="p-4">
          <h3 className="font-display text-base font-semibold text-foreground mb-1 line-clamp-1">
            {title}
          </h3>
          <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
            {excerpt}
          </p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <MapPin className="h-3 w-3 text-primary" />
              <span>Kinshasa</span>
            </div>
            <div className="flex items-center gap-1 text-primary text-sm font-medium">
              <span>Voir plus</span>
              <ChevronRight className="h-4 w-4" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
