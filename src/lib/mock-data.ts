export type UserRole = 'admin' | 'proprietaire' | 'locataire';

export interface User {
  id: string;
  name: string;
  firstName: string;
  email: string;
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
}

export interface Payment {
  id: string;
  tenantName: string;
  tenantAvatar?: string;
  amount: number;
  totalAmount: number;
  status: 'paid' | 'pending' | 'late';
  date: string;
  propertyName: string;
}

export interface Message {
  id: string;
  contactName: string;
  lastMessage: string;
  time: string;
  unread: boolean;
  avatar?: string;
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

export const currentUser: User = {
  id: '1',
  name: 'Kabila',
  firstName: 'Patrick',
  email: 'patrick.kabila@email.com',
  role: 'proprietaire',
  phone: '+243 812 345 678',
};

export const mockPayments: Payment[] = [
  { id: '1', tenantName: 'Jean Mutombo', amount: 600, totalAmount: 1200, status: 'pending', date: '10 Mars 2026', propertyName: 'Apt. Gombe 3B' },
  { id: '2', tenantName: 'Marie Lunda', amount: 800, totalAmount: 800, status: 'paid', date: '01 Mars 2026', propertyName: 'Studio Lingwala' },
  { id: '3', tenantName: 'Paul Kasongo', amount: 0, totalAmount: 950, status: 'late', date: '28 Fév 2026', propertyName: 'Maison Lemba' },
  { id: '4', tenantName: 'Sophie Mbeki', amount: 450, totalAmount: 450, status: 'paid', date: '05 Mars 2026', propertyName: 'Apt. Bandalungwa' },
  { id: '5', tenantName: 'David Tshisekedi', amount: 350, totalAmount: 700, status: 'pending', date: '15 Mars 2026', propertyName: 'Duplex Ngaliema' },
];

export const mockProperties: Property[] = [
  { id: '1', name: 'Apt. Gombe 3B', address: '45 Av. du Commerce, Gombe', monthlyRevenue: 1200, tenantCount: 1, type: 'Appartement' },
  { id: '2', name: 'Studio Lingwala', address: '12 Rue Kabinda, Lingwala', monthlyRevenue: 800, tenantCount: 1, type: 'Studio' },
  { id: '3', name: 'Maison Lemba', address: '78 Av. Université, Lemba', monthlyRevenue: 950, tenantCount: 2, type: 'Maison' },
  { id: '4', name: 'Apt. Bandalungwa', address: '23 Rue Flambeau, Bandalungwa', monthlyRevenue: 450, tenantCount: 1, type: 'Appartement' },
  { id: '5', name: 'Duplex Ngaliema', address: '5 Av. des Cliniques, Ngaliema', monthlyRevenue: 700, tenantCount: 1, type: 'Duplex' },
];

export const mockMessages: Message[] = [
  { id: '1', contactName: 'Jean Mutombo', lastMessage: 'Je ferai le virement demain matin', time: '14:32', unread: true },
  { id: '2', contactName: 'Marie Lunda', lastMessage: 'Merci, paiement effectué ✅', time: '10:15', unread: false },
  { id: '3', contactName: 'Paul Kasongo', lastMessage: 'Pouvez-vous me rappeler le montant ?', time: 'Hier', unread: true },
  { id: '4', contactName: 'Sophie Mbeki', lastMessage: 'Le contrat est bien reçu', time: 'Hier', unread: false },
];

export const mockActivities: Activity[] = [
  { id: '1', type: 'payment', text: 'Paiement reçu de Marie Lunda', time: 'Il y a 2h' },
  { id: '2', type: 'reminder', text: 'Relance envoyée à Paul Kasongo', time: 'Il y a 5h' },
  { id: '3', type: 'contract', text: 'Contrat signé – Apt. Gombe 3B', time: 'Hier' },
  { id: '4', type: 'message', text: 'Nouveau message de Jean Mutombo', time: 'Hier' },
];

export const mockNotifications: Notification[] = [
  { id: '1', type: 'payment', title: 'Paiement reçu', description: 'Marie Lunda a payé 800€', time: 'Il y a 2h', read: false },
  { id: '2', type: 'late', title: 'Retard détecté', description: 'Paul Kasongo – 950€ en retard', time: 'Il y a 5h', read: false },
  { id: '3', type: 'message', title: 'Message reçu', description: 'Jean Mutombo vous a envoyé un message', time: 'Hier', read: true },
  { id: '4', type: 'contract', title: 'Contrat signé', description: 'Apt. Gombe 3B – contrat validé', time: 'Hier', read: true },
];

export const dashboardStats = {
  paid: 2,
  pending: 2,
  late: 1,
  totalRevenue: 4100,
  totalCollected: 2050,
};
