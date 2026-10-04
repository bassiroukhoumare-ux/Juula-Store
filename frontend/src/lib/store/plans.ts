// Lead-credit packs — single source for the landing page pricing and the
// dashboard recharge modal. One credit = one order (lead) received.
export interface LeadPack {
  credits: number;
  price: number; // FCFA
  label: string;
  popular: boolean;
  costPerLead: string;
  discount?: string;
  tagline: string;
}

export const LEAD_PACKS: LeadPack[] = [
  {
    credits: 50,
    price: 5000,
    label: 'Pack Découverte',
    popular: false,
    costPerLead: '100 FCFA/lead',
    tagline: 'Pour tester votre premier produit',
  },
  {
    credits: 150,
    price: 12500,
    label: 'Pack Croissance',
    popular: true,
    costPerLead: '83 FCFA/lead',
    discount: '-17%',
    tagline: 'Pour les boutiques qui vendent chaque jour',
  },
  {
    credits: 500,
    price: 35000,
    label: 'Pack Scaler Pro',
    popular: false,
    costPerLead: '70 FCFA/lead',
    discount: '-30%',
    tagline: 'Pour scaler vos campagnes Facebook & TikTok',
  },
];

/** Credits offered to every new store (see initialKpis in data/mockData). */
export const WELCOME_CREDITS = 100;
