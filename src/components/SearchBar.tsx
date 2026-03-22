import { useState } from 'react';
import { Search, MapPin, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface SearchBarProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  onLocationClick?: (coords: { lat: number; lng: number }) => void;
  showLocationButton?: boolean;
}

export function SearchBar({ 
  placeholder = "Rechercher...", 
  onSearch,
  onLocationClick,
  showLocationButton = true 
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isLocating, setIsLocating] = useState(false);

  const handleSearch = () => {
    onSearch(query);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleLocation = () => {
    if (!navigator.geolocation) {
      alert("La géolocalisation n'est pas supportée par votre navigateur");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        onLocationClick?.({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      (error) => {
        setIsLocating(false);
        console.error('Geolocation error:', error);
        alert("Impossible d'obtenir votre position. Vérifiez vos paramètres de localisation.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          className="pl-10 pr-4 bg-card border-border"
        />
      </div>
      {showLocationButton && (
        <Button
          variant="outline"
          size="icon"
          onClick={handleLocation}
          disabled={isLocating}
          className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 border-0"
        >
          {isLocating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MapPin className="h-4 w-4" />
          )}
        </Button>
      )}
      <Button onClick={handleSearch} className="shrink-0 hero-gradient">
        <Search className="h-4 w-4" />
      </Button>
    </div>
  );
}
