import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Phone, MessageSquare } from 'lucide-react';
import { useProfile } from '@/hooks/use-data';
import { Skeleton } from '@/components/ui/skeleton';

export default function ContactDetail() {
  const { userId } = useParams<{ userId: string }>();
  const { data: profile, isLoading } = useProfile(userId || '');

  if (isLoading) return <div className="p-4 max-w-lg mx-auto"><Skeleton className="h-60" /></div>;
  if (!profile) return <div className="p-4 text-center text-sm text-muted-foreground">Contact introuvable</div>;

  const name = `${profile.first_name} ${profile.last_name}`.trim() || 'Utilisateur';
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2);

  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      {/* Cover */}
      <div className="relative h-48 bg-gradient-to-br from-primary/30 to-secondary/30 overflow-hidden">
        {(profile as any).background_url && (
          <img src={(profile as any).background_url} className="w-full h-full object-cover" />
        )}
        <Link to="/contacts" className="absolute top-3 left-3 h-9 w-9 rounded-full bg-foreground/20 flex items-center justify-center text-background">
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </div>

      {/* Avatar overlapping */}
      <div className="relative px-4 -mt-16">
        <div className="h-28 w-28 rounded-full border-4 border-card bg-primary/10 flex items-center justify-center overflow-hidden text-3xl font-bold text-primary">
          {profile.avatar_url ? <img src={profile.avatar_url} className="h-full w-full object-cover" /> : initials}
        </div>
      </div>

      <div className="px-4 mt-3">
        <h1 className="text-xl font-bold text-foreground">{name}</h1>
        {profile.phone && <p className="text-sm text-muted-foreground mt-1">{profile.phone}</p>}
      </div>

      {/* Action buttons - GREEN, rounded */}
      <div className="flex gap-4 px-4 mt-4">
        {profile.phone && (
          <>
            <a href={`tel:${profile.phone}`} className="flex-1 flex flex-col items-center gap-1 py-3 rounded-full bg-green-500 text-white">
              <Phone className="h-5 w-5" />
              <span className="text-xs font-medium">Appeler</span>
            </a>
            {/* WhatsApp call (direct) */}
            <a
              href={`https://wa.me/${profile.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent('Bonjour, je vous contacte via Pro Immobilier.')}`}
              target="_blank" rel="noopener noreferrer"
              className="flex-1 flex flex-col items-center gap-1 py-3 rounded-full bg-green-500 text-white"
            >
              <MessageSquare className="h-5 w-5" />
              <span className="text-xs font-medium">Appel WhatsApp</span>
            </a>
          </>
        )}
      </div>

      {/* Info */}
      <div className="px-4 mt-6 space-y-3">
        <div className="p-4 rounded-xl bg-card border border-border">
          <p className="text-xs font-semibold text-muted-foreground mb-1">Membre depuis</p>
          <p className="text-sm text-foreground">{new Date(profile.created_at).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>
    </div>
  );
}
