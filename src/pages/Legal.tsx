import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Sparkles, BookOpen } from 'lucide-react';
import { useAppContent } from '@/hooks/use-data';
import { Skeleton } from '@/components/ui/skeleton';

const META: Record<string, { title: string; icon: any; fallback: string }> = {
  terms: {
    title: 'Termes & Confidentialité',
    icon: ShieldCheck,
    fallback: `# 1. Acceptation des conditions
En utilisant Pro Immobilier, vous acceptez les présentes conditions d'utilisation. Cette application est réservée aux professionnels de l'immobilier.

# 2. Compte utilisateur
L'inscription se fait via un numéro de téléphone unique. Un seul compte par numéro est autorisé.

# 3. Contenu publié
Toutes les annonces publiées doivent concerner des biens immobiliers réels. Les annonces frauduleuses, dupliquées ou hors-sujet seront supprimées sans préavis.

# 4. Diffusion publique
Les annonces que vous publiez dans les groupes sont automatiquement relayées sur www.zwandako.com pour amplifier leur portée.

# 5. Confidentialité des données
Vos données personnelles ne sont partagées avec aucun tiers.

# 6. Modération
Les administrateurs de groupe peuvent valider ou refuser les demandes d'adhésion.

# 7. Suppression du compte
Vous pouvez demander la suppression complète de votre compte à tout moment.`,
  },
  avantages: {
    title: 'Pourquoi Pro Immobilier ?',
    icon: Sparkles,
    fallback: `# 📂 Tout est rangé
Sur les messageries classiques, les annonces se perdent dans le scroll. Ici, chaque groupe a sa propre liste structurée.

# 🔍 Recherche instantanée
Tapez un mot-clé et toutes les annonces correspondantes s'affichent.

# ⭐ Vos favoris en un clic
Sauvegardez les annonces qui vous intéressent.

# 🌍 Diffusion automatique sur zwandako.com
Chaque annonce publiée ici est automatiquement publiée sur www.zwandako.com.

# 👥 Réseau 100% pro
Pas de spam, pas de curieux. Uniquement des agents validés.

# 📞 Contact direct
Un bouton ouvre directement la conversation avec le propriétaire, lien inclus.

# 🔔 Notifications intelligentes
Soyez alerté en temps réel.

# 📱 App native
Installez Pro Immobilier sur votre écran d'accueil.

En résumé : moins de chaos, plus de business.`,
  },
  tuto: {
    title: 'Tuto — Comment ça marche',
    icon: BookOpen,
    fallback: `# 1. Créer ou rejoindre un groupe
Sur la page d'accueil, appuyez sur le bouton + en bas à droite pour créer un groupe, ou utilisez la loupe 🔍 pour chercher un groupe existant et demander à rejoindre.

# 2. Publier une annonce
Ouvrez un groupe, appuyez sur « Publier une annonce » en bas. Ajoutez un titre, des photos et la description.

# 3. Diffusion sur zwandako.com
Dès qu'elle est publiée, votre annonce est automatiquement envoyée à www.zwandako.com.

# 4. Ajouter aux favoris
Appuyez sur l'icône marque-page sur n'importe quelle annonce.

# 5. Contacter un agent
Appuyez sur Message d'une annonce pour ouvrir directement la conversation avec le propriétaire.

# 6. Installer l'application
Depuis le menu ⋮ en haut à droite, choisissez « Installer l'App ».`,
  },
};

function renderContent(text: string) {
  // Simple markdown-ish: # Heading, blank lines = paragraph break
  const blocks = text.split(/\n{2,}/);
  return blocks.map((block, i) => {
    const trimmed = block.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('# ')) {
      return <h2 key={i} className="text-base font-bold text-foreground mt-4">{trimmed.slice(2)}</h2>;
    }
    if (trimmed.startsWith('## ')) {
      return <h3 key={i} className="text-sm font-bold text-foreground mt-3">{trimmed.slice(3)}</h3>;
    }
    return <p key={i} className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">{trimmed}</p>;
  });
}

export default function Legal() {
  const { page } = useParams<{ page: string }>();
  const meta = META[page || 'terms'];
  const { data, isLoading } = useAppContent(page || 'terms');

  if (!meta) return <div className="p-4 text-center text-sm text-muted-foreground">Page introuvable</div>;
  const Icon = meta.icon;
  const content = (data?.content && data.content.trim()) || meta.fallback;

  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      <header className="sticky top-0 z-50 bg-card/60 backdrop-blur-md border-b border-border">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link to="/profil" className="text-muted-foreground"><ArrowLeft className="h-5 w-5" /></Link>
          <Icon className="h-5 w-5 text-primary" />
          <h1 className="text-base font-bold flex-1 text-foreground truncate">{meta.title}</h1>
        </div>
      </header>
      <div className="px-4 py-5 pb-24 space-y-2">
        {isLoading ? <Skeleton className="h-40" /> : renderContent(content)}
      </div>
    </div>
  );
}
