export type UserRole = 'admin' | 'proprietaire' | 'locataire';

export interface User {
  id: string;
  name: string;
  firstName: string;
  email: string;
  password: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
}

export interface Property {
  id: string;
  name: string;
  address: string;
  monthlyRevenue: number;
  tenantCount: number;
  image?: string;
  type: string;
  ownerId: string;
  tenants: TenantInfo[];
  documents: Document[];
}

export interface TenantInfo {
  id: string;
  name: string;
  email: string;
  phone: string;
  moveInDate: string;
  rentAmount: number;
  paymentHistory: PaymentRecord[];
  rating: number;
  onTimeRate: number;
  lateCount: number;
  reviews: Review[];
  badge: 'fiable' | 'moyen' | 'risque';
  verified: boolean;
}

export interface Review {
  author: string;
  text: string;
  date: string;
  rating: number;
}

export interface PaymentRecord {
  id: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'late';
}

export interface Payment {
  id: string;
  tenantName: string;
  tenantId: string;
  tenantAvatar?: string;
  amount: number;
  totalAmount: number;
  status: 'paid' | 'pending' | 'late';
  date: string;
  propertyName: string;
  propertyId: string;
}

export interface Message {
  id: string;
  contactName: string;
  contactId: string;
  lastMessage: string;
  time: string;
  unread: boolean;
  avatar?: string;
  messages: ChatMessage[];
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'me' | 'other';
  time: string;
}

export interface Activity {
  id: string;
  type: 'payment' | 'reminder' | 'contract' | 'message';
  text: string;
  time: string;
}

export interface Notification {
  id: string;
  type: 'payment' | 'late' | 'message' | 'contract';
  title: string;
  description: string;
  time: string;
  read: boolean;
}

export interface Document {
  id: string;
  name: string;
  category: 'contrat' | 'facture' | 'etat_des_lieux' | 'autre';
  date: string;
  size: string;
  propertyId?: string;
}

export interface AdminTransaction {
  id: string;
  tenantName: string;
  ownerName: string;
  propertyName: string;
  amount: number;
  status: 'encaisse' | 'en_attente' | 'transfere';
  date: string;
}

// ===== TEST ACCOUNTS =====
export const testUsers: User[] = [
  {
    id: 'admin-1',
    name: 'Diallo',
    firstName: 'Aminata',
    email: 'admin@gestimmo.com',
    password: 'admin123',
    role: 'admin',
    phone: '+243 999 000 001',
  },
  {
    id: 'proprio-1',
    name: 'Kabila',
    firstName: 'Patrick',
    email: 'patrick@gestimmo.com',
    password: 'proprio123',
    role: 'proprietaire',
    phone: '+243 812 345 678',
  },
  {
    id: 'locataire-1',
    name: 'Mutombo',
    firstName: 'Jean',
    email: 'jean@gestimmo.com',
    password: 'locataire123',
    role: 'locataire',
    phone: '+243 810 111 222',
  },
];

// ===== TENANT PROFILES =====
export const tenantProfiles: TenantInfo[] = [
  {
    id: 'locataire-1',
    name: 'Jean Mutombo',
    email: 'jean@gestimmo.com',
    phone: '+243 810 111 222',
    moveInDate: '15 Jan 2025',
    rentAmount: 1200,
    paymentHistory: [
      { id: 'ph1', date: '01 Mar 2026', amount: 600, status: 'pending' },
      { id: 'ph2', date: '01 Fév 2026', amount: 1200, status: 'paid' },
      { id: 'ph3', date: '01 Jan 2026', amount: 1200, status: 'paid' },
      { id: 'ph4', date: '01 Déc 2025', amount: 1200, status: 'paid' },
      { id: 'ph5', date: '01 Nov 2025', amount: 1200, status: 'late' },
      { id: 'ph6', date: '01 Oct 2025', amount: 1200, status: 'paid' },
    ],
    rating: 4.3,
    onTimeRate: 90,
    lateCount: 2,
    reviews: [
      { author: 'Patrick Kabila', text: 'Très fiable, paiement toujours ponctuel', date: '20 Fév 2026', rating: 5 },
      { author: 'Marie Lunda', text: 'Bon locataire, appartement bien entretenu', date: '15 Jan 2026', rating: 4 },
    ],
    badge: 'fiable',
    verified: true,
  },
  {
    id: 'tenant-2',
    name: 'Marie Lunda',
    email: 'marie.lunda@email.com',
    phone: '+243 810 222 333',
    moveInDate: '01 Mar 2025',
    rentAmount: 800,
    paymentHistory: [
      { id: 'ph7', date: '01 Mar 2026', amount: 800, status: 'paid' },
      { id: 'ph8', date: '01 Fév 2026', amount: 800, status: 'paid' },
      { id: 'ph9', date: '01 Jan 2026', amount: 800, status: 'paid' },
    ],
    rating: 4.8,
    onTimeRate: 100,
    lateCount: 0,
    reviews: [
      { author: 'Patrick Kabila', text: 'Excellente locataire, jamais de retard', date: '10 Mar 2026', rating: 5 },
    ],
    badge: 'fiable',
    verified: true,
  },
  {
    id: 'tenant-3',
    name: 'Paul Kasongo',
    email: 'paul.kasongo@email.com',
    phone: '+243 810 333 444',
    moveInDate: '10 Juin 2025',
    rentAmount: 950,
    paymentHistory: [
      { id: 'ph10', date: '01 Mar 2026', amount: 0, status: 'late' },
      { id: 'ph11', date: '01 Fév 2026', amount: 950, status: 'late' },
      { id: 'ph12', date: '01 Jan 2026', amount: 950, status: 'paid' },
    ],
    rating: 2.8,
    onTimeRate: 55,
    lateCount: 5,
    reviews: [
      { author: 'Patrick Kabila', text: 'Retards fréquents, communication difficile', date: '05 Mar 2026', rating: 2 },
    ],
    badge: 'risque',
    verified: true,
  },
  {
    id: 'tenant-4',
    name: 'Sophie Mbeki',
    email: 'sophie.mbeki@email.com',
    phone: '+243 810 444 555',
    moveInDate: '01 Sep 2025',
    rentAmount: 450,
    paymentHistory: [
      { id: 'ph13', date: '01 Mar 2026', amount: 450, status: 'paid' },
      { id: 'ph14', date: '01 Fév 2026', amount: 450, status: 'paid' },
      { id: 'ph15', date: '01 Jan 2026', amount: 450, status: 'late' },
    ],
    rating: 3.5,
    onTimeRate: 75,
    lateCount: 3,
    reviews: [
      { author: 'Patrick Kabila', text: 'Correct dans l\'ensemble, quelques retards', date: '01 Mar 2026', rating: 3 },
    ],
    badge: 'moyen',
    verified: false,
  },
  {
    id: 'tenant-5',
    name: 'David Tshisekedi',
    email: 'david.tshi@email.com',
    phone: '+243 810 555 666',
    moveInDate: '15 Nov 2025',
    rentAmount: 700,
    paymentHistory: [
      { id: 'ph16', date: '01 Mar 2026', amount: 350, status: 'pending' },
      { id: 'ph17', date: '01 Fév 2026', amount: 700, status: 'paid' },
    ],
    rating: 4.0,
    onTimeRate: 85,
    lateCount: 1,
    reviews: [
      { author: 'Patrick Kabila', text: 'Bon locataire, communique bien', date: '15 Fév 2026', rating: 4 },
    ],
    badge: 'fiable',
    verified: true,
  },
];

// ===== PAYMENTS =====
export const mockPayments: Payment[] = [
  { id: '1', tenantName: 'Jean Mutombo', tenantId: 'locataire-1', amount: 600, totalAmount: 1200, status: 'pending', date: '10 Mars 2026', propertyName: 'Apt. Gombe 3B', propertyId: '1' },
  { id: '2', tenantName: 'Marie Lunda', tenantId: 'tenant-2', amount: 800, totalAmount: 800, status: 'paid', date: '01 Mars 2026', propertyName: 'Studio Lingwala', propertyId: '2' },
  { id: '3', tenantName: 'Paul Kasongo', tenantId: 'tenant-3', amount: 0, totalAmount: 950, status: 'late', date: '28 Fév 2026', propertyName: 'Maison Lemba', propertyId: '3' },
  { id: '4', tenantName: 'Sophie Mbeki', tenantId: 'tenant-4', amount: 450, totalAmount: 450, status: 'paid', date: '05 Mars 2026', propertyName: 'Apt. Bandalungwa', propertyId: '4' },
  { id: '5', tenantName: 'David Tshisekedi', tenantId: 'tenant-5', amount: 350, totalAmount: 700, status: 'pending', date: '15 Mars 2026', propertyName: 'Duplex Ngaliema', propertyId: '5' },
];

// ===== PROPERTIES =====
export const mockProperties: Property[] = [
  {
    id: '1', name: 'Apt. Gombe 3B', address: '45 Av. du Commerce, Gombe', monthlyRevenue: 1200, tenantCount: 1, type: 'Appartement', ownerId: 'proprio-1',
    tenants: [tenantProfiles[0]],
    documents: [
      { id: 'd1', name: 'Contrat de bail - Mutombo', category: 'contrat', date: '15 Jan 2025', size: '2.4 MB' },
      { id: 'd2', name: 'État des lieux entrée', category: 'etat_des_lieux', date: '15 Jan 2025', size: '5.1 MB' },
    ],
  },
  {
    id: '2', name: 'Studio Lingwala', address: '12 Rue Kabinda, Lingwala', monthlyRevenue: 800, tenantCount: 1, type: 'Studio', ownerId: 'proprio-1',
    tenants: [tenantProfiles[1]],
    documents: [
      { id: 'd3', name: 'Contrat de bail - Lunda', category: 'contrat', date: '01 Mar 2025', size: '2.1 MB' },
    ],
  },
  {
    id: '3', name: 'Maison Lemba', address: '78 Av. Université, Lemba', monthlyRevenue: 950, tenantCount: 1, type: 'Maison', ownerId: 'proprio-1',
    tenants: [tenantProfiles[2]],
    documents: [
      { id: 'd4', name: 'Contrat de bail - Kasongo', category: 'contrat', date: '10 Juin 2025', size: '2.3 MB' },
      { id: 'd5', name: 'Facture travaux', category: 'facture', date: '20 Déc 2025', size: '1.2 MB' },
    ],
  },
  {
    id: '4', name: 'Apt. Bandalungwa', address: '23 Rue Flambeau, Bandalungwa', monthlyRevenue: 450, tenantCount: 1, type: 'Appartement', ownerId: 'proprio-1',
    tenants: [tenantProfiles[3]],
    documents: [
      { id: 'd6', name: 'Contrat de bail - Mbeki', category: 'contrat', date: '01 Sep 2025', size: '2.0 MB' },
    ],
  },
  {
    id: '5', name: 'Duplex Ngaliema', address: '5 Av. des Cliniques, Ngaliema', monthlyRevenue: 700, tenantCount: 1, type: 'Duplex', ownerId: 'proprio-1',
    tenants: [tenantProfiles[4]],
    documents: [
      { id: 'd7', name: 'Contrat de bail - Tshisekedi', category: 'contrat', date: '15 Nov 2025', size: '2.2 MB' },
      { id: 'd8', name: 'État des lieux entrée', category: 'etat_des_lieux', date: '15 Nov 2025', size: '4.8 MB' },
      { id: 'd9', name: 'Facture plomberie', category: 'facture', date: '10 Jan 2026', size: '0.8 MB' },
    ],
  },
];

// ===== MESSAGES =====
export const mockMessages: Message[] = [
  {
    id: '1', contactName: 'Jean Mutombo', contactId: 'locataire-1', lastMessage: 'Je ferai le virement demain matin', time: '14:32', unread: true,
    messages: [
      { id: 'cm1', text: 'Bonjour M. Kabila, je voulais vous informer du paiement', sender: 'other', time: '14:20' },
      { id: 'cm2', text: 'Bonjour Jean, quand pensez-vous régler le loyer ?', sender: 'me', time: '14:25' },
      { id: 'cm3', text: 'Je ferai le virement demain matin', sender: 'other', time: '14:32' },
    ],
  },
  {
    id: '2', contactName: 'Marie Lunda', contactId: 'tenant-2', lastMessage: 'Merci, paiement effectué ✅', time: '10:15', unread: false,
    messages: [
      { id: 'cm4', text: 'Bonjour Marie, le loyer de mars est dû', sender: 'me', time: '09:00' },
      { id: 'cm5', text: 'Bonjour, je fais le virement maintenant', sender: 'other', time: '09:45' },
      { id: 'cm6', text: 'Merci, paiement effectué ✅', sender: 'other', time: '10:15' },
      { id: 'cm7', text: 'Bien reçu, merci Marie !', sender: 'me', time: '10:20' },
    ],
  },
  {
    id: '3', contactName: 'Paul Kasongo', contactId: 'tenant-3', lastMessage: 'Pouvez-vous me rappeler le montant ?', time: 'Hier', unread: true,
    messages: [
      { id: 'cm8', text: 'M. Kasongo, votre loyer de février est en retard', sender: 'me', time: 'Hier 09:00' },
      { id: 'cm9', text: 'Pouvez-vous me rappeler le montant ?', sender: 'other', time: 'Hier 11:30' },
    ],
  },
  {
    id: '4', contactName: 'Sophie Mbeki', contactId: 'tenant-4', lastMessage: 'Le contrat est bien reçu', time: 'Hier', unread: false,
    messages: [
      { id: 'cm10', text: 'Sophie, je vous envoie le nouveau contrat', sender: 'me', time: 'Hier 14:00' },
      { id: 'cm11', text: 'Le contrat est bien reçu', sender: 'other', time: 'Hier 16:30' },
    ],
  },
  {
    id: '5', contactName: 'David Tshisekedi', contactId: 'tenant-5', lastMessage: 'Je paierai la 2e moitié le 30', time: 'Lun', unread: false,
    messages: [
      { id: 'cm12', text: 'David, votre paiement partiel est bien reçu', sender: 'me', time: 'Lun 10:00' },
      { id: 'cm13', text: 'Merci M. Kabila. Je paierai la 2e moitié le 30', sender: 'other', time: 'Lun 10:30' },
    ],
  },
];

// ===== ACTIVITIES =====
export const mockActivities: Activity[] = [
  { id: '1', type: 'payment', text: 'Paiement reçu de Marie Lunda – 800€', time: 'Il y a 2h' },
  { id: '2', type: 'reminder', text: 'Relance envoyée à Paul Kasongo', time: 'Il y a 5h' },
  { id: '3', type: 'contract', text: 'Contrat signé – Apt. Gombe 3B', time: 'Hier' },
  { id: '4', type: 'message', text: 'Nouveau message de Jean Mutombo', time: 'Hier' },
  { id: '5', type: 'payment', text: 'Paiement partiel de David Tshisekedi – 350€', time: 'Lundi' },
];

// ===== NOTIFICATIONS =====
export const mockNotifications: Notification[] = [
  { id: '1', type: 'payment', title: 'Paiement reçu', description: 'Marie Lunda a payé 800€ – Studio Lingwala', time: 'Il y a 2h', read: false },
  { id: '2', type: 'late', title: 'Retard détecté', description: 'Paul Kasongo – 950€ en retard depuis 22 jours', time: 'Il y a 5h', read: false },
  { id: '3', type: 'message', title: 'Message reçu', description: 'Jean Mutombo vous a envoyé un message', time: 'Hier', read: true },
  { id: '4', type: 'contract', title: 'Contrat signé', description: 'Apt. Gombe 3B – contrat validé par Jean Mutombo', time: 'Hier', read: true },
  { id: '5', type: 'payment', title: 'Paiement partiel', description: 'David Tshisekedi a payé 350€ sur 700€', time: 'Lundi', read: true },
];

// ===== DOCUMENTS =====
export const allDocuments: Document[] = [
  { id: 'd1', name: 'Contrat de bail - Mutombo', category: 'contrat', date: '15 Jan 2025', size: '2.4 MB', propertyId: '1' },
  { id: 'd2', name: 'État des lieux entrée - Gombe', category: 'etat_des_lieux', date: '15 Jan 2025', size: '5.1 MB', propertyId: '1' },
  { id: 'd3', name: 'Contrat de bail - Lunda', category: 'contrat', date: '01 Mar 2025', size: '2.1 MB', propertyId: '2' },
  { id: 'd4', name: 'Contrat de bail - Kasongo', category: 'contrat', date: '10 Juin 2025', size: '2.3 MB', propertyId: '3' },
  { id: 'd5', name: 'Facture travaux - Lemba', category: 'facture', date: '20 Déc 2025', size: '1.2 MB', propertyId: '3' },
  { id: 'd6', name: 'Contrat de bail - Mbeki', category: 'contrat', date: '01 Sep 2025', size: '2.0 MB', propertyId: '4' },
  { id: 'd7', name: 'Contrat de bail - Tshisekedi', category: 'contrat', date: '15 Nov 2025', size: '2.2 MB', propertyId: '5' },
  { id: 'd8', name: 'État des lieux entrée - Ngaliema', category: 'etat_des_lieux', date: '15 Nov 2025', size: '4.8 MB', propertyId: '5' },
  { id: 'd9', name: 'Facture plomberie - Ngaliema', category: 'facture', date: '10 Jan 2026', size: '0.8 MB', propertyId: '5' },
  { id: 'd10', name: 'Facture électricité - Gombe', category: 'facture', date: '05 Fév 2026', size: '0.5 MB', propertyId: '1' },
];

// ===== ADMIN DATA =====
export const adminTransactions: AdminTransaction[] = [
  { id: 'at1', tenantName: 'Marie Lunda', ownerName: 'Patrick Kabila', propertyName: 'Studio Lingwala', amount: 800, status: 'transfere', date: '02 Mars 2026' },
  { id: 'at2', tenantName: 'Sophie Mbeki', ownerName: 'Patrick Kabila', propertyName: 'Apt. Bandalungwa', amount: 450, status: 'transfere', date: '06 Mars 2026' },
  { id: 'at3', tenantName: 'Jean Mutombo', ownerName: 'Patrick Kabila', propertyName: 'Apt. Gombe 3B', amount: 600, status: 'en_attente', date: '10 Mars 2026' },
  { id: 'at4', tenantName: 'David Tshisekedi', ownerName: 'Patrick Kabila', propertyName: 'Duplex Ngaliema', amount: 350, status: 'en_attente', date: '15 Mars 2026' },
  { id: 'at5', tenantName: 'Paul Kasongo', ownerName: 'Patrick Kabila', propertyName: 'Maison Lemba', amount: 950, status: 'en_attente', date: '28 Fév 2026' },
];

export const adminStats = {
  totalEncaisse: 3050,
  enAttente: 1900,
  transfere: 1250,
  totalProperties: 5,
  totalTenants: 5,
  totalOwners: 1,
  alertsCount: 2,
};

export const dashboardStats = {
  paid: 2,
  pending: 2,
  late: 1,
  totalRevenue: 4100,
  totalCollected: 2050,
};

// ===== LOCATAIRE-SPECIFIC DATA =====
export const locatairePayments = [
  { id: 'lp1', month: 'Mars 2026', amount: 1200, paid: 600, status: 'pending' as const, date: '10 Mars 2026', propertyName: 'Apt. Gombe 3B' },
  { id: 'lp2', month: 'Février 2026', amount: 1200, paid: 1200, status: 'paid' as const, date: '01 Fév 2026', propertyName: 'Apt. Gombe 3B' },
  { id: 'lp3', month: 'Janvier 2026', amount: 1200, paid: 1200, status: 'paid' as const, date: '01 Jan 2026', propertyName: 'Apt. Gombe 3B' },
  { id: 'lp4', month: 'Décembre 2025', amount: 1200, paid: 1200, status: 'paid' as const, date: '01 Déc 2025', propertyName: 'Apt. Gombe 3B' },
  { id: 'lp5', month: 'Novembre 2025', amount: 1200, paid: 1200, status: 'late' as const, date: '15 Nov 2025', propertyName: 'Apt. Gombe 3B' },
];
