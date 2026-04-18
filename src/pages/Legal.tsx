import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Sparkles, BookOpen } from 'lucide-react';

const PAGES: Record<string, { title: string; icon: any; content: JSX.Element }> = {
  terms: {
    title: 'Termes & Confidentialité',
    icon: ShieldCheck,
    content: (
      <div className="space-y-4 text-sm text-foreground leading-relaxed">
        <h2 className="text-base font-bold">1. Acceptation des conditions</h2>
        <p>En utilisant Pro Immobilier, vous acceptez les présentes conditions d'utilisation. Cette application est réservée aux professionnels de l'immobilier.</p>

        <h2 className="text-base font-bold">2. Compte utilisateur</h2>
        <p>L'inscription se fait via un numéro de téléphone unique. Un seul compte par numéro est autorisé. Vous êtes responsable de la confidentialité de votre accès.</p>

        <h2 className="text-base font-bold">3. Contenu publié</h2>
        <p>Toutes les annonces publiées doivent concerner des biens immobiliers réels. Les annonces frauduleuses, dupliquées ou hors-sujet seront supprimées sans préavis.</p>

        <h2 className="text-base font-bold">4. Diffusion publique</h2>
        <p>Les annonces que vous publiez dans les groupes sont automatiquement relayées sur <a href="https://www.zwandako.com" className="text-primary font-semibold">www.zwandako.com</a> pour amplifier leur portée auprès des acheteurs.</p>

        <h2 className="text-base font-bold">5. Confidentialité des données</h2>
        <p>Vos données personnelles (téléphone, nom, email) ne sont partagées avec aucun tiers. Elles servent uniquement à vous permettre d'utiliser l'application et à vous identifier auprès des autres professionnels.</p>

        <h2 className="text-base font-bold">6. Vie privée</h2>
        <p>Les autres membres voient votre nom, photo et numéro de téléphone uniquement dans les groupes que vous avez rejoints. Vous pouvez modifier ou supprimer vos informations à tout moment depuis votre profil.</p>

        <h2 className="text-base font-bold">7. Modération</h2>
        <p>Les administrateurs de groupe peuvent valider ou refuser les demandes d'adhésion, supprimer des contenus inappropriés et exclure des membres.</p>

        <h2 className="text-base font-bold">8. Suppression du compte</h2>
        <p>Vous pouvez demander la suppression complète de votre compte et de toutes vos données en nous contactant. La suppression est définitive sous 30 jours.</p>

        <h2 className="text-base font-bold">9. Modifications</h2>
        <p>Ces conditions peuvent évoluer. Toute modification importante vous sera notifiée dans l'application.</p>
      </div>
    ),
  },
  avantages: {
    title: 'Pourquoi Pro Immobilier ?',
    icon: Sparkles,
    content: (
      <div className="space-y-4 text-sm text-foreground leading-relaxed">
        <p className="text-muted-foreground italic">Pro Immobilier vs WhatsApp simple : ce que vous gagnez en passant au réseau professionnel.</p>

        <div className="p-3 rounded-xl bg-card border border-border">
          <h3 className="font-bold text-foreground">📂 Tout est rangé</h3>
          <p className="text-xs text-muted-foreground mt-1">Sur WhatsApp, les annonces se perdent dans le scroll. Ici, chaque groupe a sa propre liste structurée — vous retrouvez n'importe quelle annonce en quelques secondes.</p>
        </div>

        <div className="p-3 rounded-xl bg-card border border-border">
          <h3 className="font-bold text-foreground">🔍 Recherche instantanée</h3>
          <p className="text-xs text-muted-foreground mt-1">Tapez un mot-clé (quartier, type de bien, prix), et toutes les annonces correspondantes s'affichent. Impossible avec WhatsApp.</p>
        </div>

        <div className="p-3 rounded-xl bg-card border border-border">
          <h3 className="font-bold text-foreground">⭐ Vos favoris en un clic</h3>
          <p className="text-xs text-muted-foreground mt-1">Sauvegardez les annonces qui vous intéressent dans vos favoris. Plus besoin de remonter dans la conversation pendant des heures.</p>
        </div>

        <div className="p-3 rounded-xl bg-card border border-border">
          <h3 className="font-bold text-foreground">🌍 Diffusion automatique sur zwandako.com</h3>
          <p className="text-xs text-muted-foreground mt-1">L'avantage le plus important : chaque annonce que vous publiez ici est automatiquement publiée sur <a href="https://www.zwandako.com" className="text-primary font-semibold">www.zwandako.com</a>. Des milliers d'acheteurs potentiels voient votre bien — sans effort supplémentaire.</p>
        </div>

        <div className="p-3 rounded-xl bg-card border border-border">
          <h3 className="font-bold text-foreground">👥 Réseau 100 % pro</h3>
          <p className="text-xs text-muted-foreground mt-1">Pas de spam, pas de curieux, pas de faux profils. Uniquement des agents et professionnels validés. Vos contacts sont qualifiés.</p>
        </div>

        <div className="p-3 rounded-xl bg-card border border-border">
          <h3 className="font-bold text-foreground">📞 Contact direct</h3>
          <p className="text-xs text-muted-foreground mt-1">Un bouton WhatsApp ouvre directement la conversation avec le propriétaire de l'annonce, lien inclus. Plus rapide qu'un copier-coller.</p>
        </div>

        <div className="p-3 rounded-xl bg-card border border-border">
          <h3 className="font-bold text-foreground">🔔 Notifications intelligentes</h3>
          <p className="text-xs text-muted-foreground mt-1">Soyez alerté quand une nouvelle annonce arrive dans vos groupes, ou quand un agent demande à rejoindre votre groupe.</p>
        </div>

        <div className="p-3 rounded-xl bg-card border border-border">
          <h3 className="font-bold text-foreground">📱 App native</h3>
          <p className="text-xs text-muted-foreground mt-1">Installez Pro Immobilier sur votre écran d'accueil et utilisez-la comme une vraie application (mode standalone, sans barre navigateur).</p>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">En résumé : <span className="font-bold text-foreground">moins de chaos, plus de business.</span></p>
      </div>
    ),
  },
  tuto: {
    title: 'Tuto — Comment ça marche',
    icon: BookOpen,
    content: (
      <div className="space-y-5 text-sm text-foreground leading-relaxed">
        <p className="text-muted-foreground">Suivez ces étapes simples pour tirer le meilleur de Pro Immobilier.</p>

        <div>
          <h3 className="font-bold flex items-center gap-2"><span className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">1</span> Créer ou rejoindre un groupe</h3>
          <img src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&h=300&fit=crop" className="w-full h-32 object-cover rounded-xl mt-2" />
          <p className="text-xs text-muted-foreground mt-2">Sur la page d'accueil, appuyez sur le bouton <strong>+</strong> en bas à droite pour créer un groupe, ou utilisez la <strong>loupe 🔍</strong> pour chercher un groupe existant et demander à rejoindre.</p>
        </div>

        <div>
          <h3 className="font-bold flex items-center gap-2"><span className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">2</span> Publier une annonce</h3>
          <img src="https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&h=300&fit=crop" className="w-full h-32 object-cover rounded-xl mt-2" />
          <p className="text-xs text-muted-foreground mt-2">Ouvrez un groupe, appuyez sur <strong>« Publier une annonce »</strong> en bas. Ajoutez un titre, des photos et la description. Astuce : copiez-collez directement le texte depuis WhatsApp — l'app extrait images et texte automatiquement.</p>
        </div>

        <div>
          <h3 className="font-bold flex items-center gap-2"><span className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">3</span> Diffusion sur zwandako.com</h3>
          <img src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&h=300&fit=crop" className="w-full h-32 object-cover rounded-xl mt-2" />
          <p className="text-xs text-muted-foreground mt-2">Dès qu'elle est publiée, votre annonce est automatiquement envoyée à <strong>www.zwandako.com</strong>. Vous pouvez aussi ajouter un lien Zwandako personnalisé dans le formulaire pour pointer vers une fiche existante.</p>
        </div>

        <div>
          <h3 className="font-bold flex items-center gap-2"><span className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">4</span> Ajouter aux favoris</h3>
          <img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&h=300&fit=crop" className="w-full h-32 object-cover rounded-xl mt-2" />
          <p className="text-xs text-muted-foreground mt-2">Sur n'importe quelle annonce, appuyez sur l'icône <strong>marque-page</strong>. Retrouvez-la dans <strong>Profil → Mes annonces → Favoris</strong>.</p>
        </div>

        <div>
          <h3 className="font-bold flex items-center gap-2"><span className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">5</span> Contacter un agent</h3>
          <img src="https://images.unsplash.com/photo-1556745757-8d76bdb6984b?w=600&h=300&fit=crop" className="w-full h-32 object-cover rounded-xl mt-2" />
          <p className="text-xs text-muted-foreground mt-2">Appuyez sur le bouton <strong>WhatsApp</strong> d'une annonce pour ouvrir directement WhatsApp sur le numéro du propriétaire, avec le lien de l'annonce déjà prêt à envoyer.</p>
        </div>

        <div>
          <h3 className="font-bold flex items-center gap-2"><span className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">6</span> Installer l'application</h3>
          <p className="text-xs text-muted-foreground mt-2">Depuis le menu <strong>⋮</strong> en haut à droite de l'accueil, choisissez <strong>« Installer l'App »</strong> pour l'ajouter à votre écran d'accueil et l'utiliser comme une vraie app native.</p>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4 italic">Tout est pensé pour les pros. Soyez efficace, et concentrez-vous sur ce qui compte : vos transactions.</p>
      </div>
    ),
  },
};

export default function Legal() {
  const { page } = useParams<{ page: string }>();
  const data = PAGES[page || 'terms'];
  if (!data) return <div className="p-4 text-center text-sm text-muted-foreground">Page introuvable</div>;
  const Icon = data.icon;

  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      <header className="sticky top-0 z-50 bg-card/60 backdrop-blur-md border-b border-border">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link to="/profil" className="text-muted-foreground"><ArrowLeft className="h-5 w-5" /></Link>
          <Icon className="h-5 w-5 text-primary" />
          <h1 className="text-base font-bold flex-1 text-foreground truncate">{data.title}</h1>
        </div>
      </header>
      <div className="px-4 py-5 pb-24">{data.content}</div>
    </div>
  );
}
