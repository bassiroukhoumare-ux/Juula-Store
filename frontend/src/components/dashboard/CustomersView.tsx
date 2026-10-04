'use client';

import React, { useState } from 'react';
import {
  Users,
  Search,
  Phone,
  PhoneCall,
  MapPin,
  ShoppingBag,
  CreditCard,
  Banknote,
  Smartphone,
  ExternalLink,
} from 'lucide-react';
import { OrderLead } from '@/types/juula';
import { Input } from '@/components/ui/Input';
import { formatFCFA } from '@/lib/orderUtils';

const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

interface CustomersViewProps {
  orders: OrderLead[];
  storeName?: string;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  orders,
  storeName = 'Ma Boutique',
}) => {
  const [search, setSearch] = useState('');

  // Group unique customers from orders
  const customersMap = new Map<
    string,
    {
      name: string;
      phone: string;
      whatsappNumber: string;
      neighborhood: string;
      deliveryAddress?: string;
      orderCount: number;
      totalSpent: number;
      lastOrderDate: string;
      preferredPayment: string;
    }
  >();

  orders.forEach((order) => {
    const key = order.phone || order.customerName;
    const existing = customersMap.get(key);
    const amount = order.totalAmount || order.amount + (order.deliveryFee || 0);

    if (existing) {
      existing.orderCount += 1;
      existing.totalSpent += amount;
      if (order.deliveryAddress) existing.deliveryAddress = order.deliveryAddress;
    } else {
      customersMap.set(key, {
        name: order.customerName,
        phone: order.phone,
        whatsappNumber: order.whatsappNumber,
        neighborhood: order.neighborhood,
        deliveryAddress: order.deliveryAddress || '',
        orderCount: 1,
        totalSpent: amount,
        lastOrderDate: order.createdAt,
        preferredPayment:
          order.paymentType === 'online_wave'
            ? 'Wave'
            : order.paymentType === 'online_orange'
            ? 'Orange Money'
            : 'Espèces (COD)',
      });
    }
  });

  const customersList = Array.from(customersMap.values());

  const filtered = customersList.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.toLowerCase().includes(search.toLowerCase()) ||
      c.neighborhood.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white border border-[#E5E9F0] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#1E60F8] bg-[#EFF4FF] px-2.5 py-0.5 rounded-lg">
              CRM Marchand
            </span>
            <span className="text-xs text-[#64748B]">
              {customersList.length} client{customersList.length > 1 ? 's' : ''} enregistré{customersList.length > 1 ? 's' : ''}
            </span>
          </div>
          <h2 className="text-2xl font-black text-[#0F172A] tracking-tight mt-1">
            Clients & Leads Cash on Delivery
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Historique complet de vos acheteurs, adresses de livraison habituelles et contact direct WhatsApp & Appel.
          </p>
        </div>

        <div className="w-full sm:w-72">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher nom, téléphone, quartier..."
            icon={<Search className="w-4 h-4 text-[#94A3B8]" />}
          />
        </div>
      </div>

      {/* Customers Table / Cards */}
      <div className="bg-white rounded-3xl border border-[#E5E9F0] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] border-b border-[#E5E9F0] text-[#64748B] font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3.5 px-6">Client & Contact</th>
                <th className="py-3.5 px-6">Quartier & Adresse Habituelle</th>
                <th className="py-3.5 px-6">Commandes</th>
                <th className="py-3.5 px-6">Total Dépensé</th>
                <th className="py-3.5 px-6">Paiement Favori</th>
                <th className="py-3.5 px-6 text-right">Action Rapide</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#94A3B8]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="w-8 h-8 text-[#CBD5E1]" />
                      <p className="text-sm font-bold text-[#64748B]">Aucun client enregistré pour le moment</p>
                      <p className="text-xs text-[#94A3B8]">Vos futurs clients s'afficheront ici automatiquement dès leurs premières commandes.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((customer, idx) => {
                const initials = customer.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase();

                // Message WhatsApp conforme : UNIQUEMENT LE NOM DE LA BOUTIQUE DU MARCHAND (SANS "JUULA STORE")
                const waMessage = encodeURIComponent(
                  `Bonjour ${customer.name} ! C'est ${storeName}. Nous espérons que votre commande vous apporte entière satisfaction ! Avez-vous besoin d'une assistance ou d'un conseil ?`
                );

                const cleanPhone = customer.phone.replace(/[^0-9+]/g, '');

                return (
                  <tr key={idx} className="hover:bg-[#F8FAFC] transition-colors">
                    {/* Customer Name & Initials */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#1E60F8] to-[#60A5FA] text-white font-extrabold flex items-center justify-center flex-shrink-0 text-xs shadow-xs">
                          {initials}
                        </div>
                        <div>
                          <span className="font-extrabold text-[#0F172A] block text-xs">
                            {customer.name}
                          </span>
                          <span className="text-[11px] text-[#64748B] flex items-center gap-1">
                            <Phone className="w-3 h-3 text-[#94A3B8]" />
                            {customer.phone}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Address & Neighborhood */}
                    <td className="py-4 px-6 max-w-xs">
                      <div className="flex items-center gap-1.5 font-bold text-[#0F172A]">
                        <MapPin className="w-3.5 h-3.5 text-[#1E60F8] flex-shrink-0" />
                        <span className="truncate">{customer.neighborhood}</span>
                      </div>
                      {customer.deliveryAddress && (
                        <p className="text-[10px] text-[#64748B] truncate mt-0.5">
                          {customer.deliveryAddress}
                        </p>
                      )}
                    </td>

                    {/* Order count */}
                    <td className="py-4 px-6 font-black text-[#0F172A]">
                      <span className="bg-[#EFF4FF] text-[#1E60F8] px-2 py-0.5 rounded-full font-bold">
                        {customer.orderCount} commande{customer.orderCount > 1 ? 's' : ''}
                      </span>
                    </td>

                    {/* Total Spent */}
                    <td className="py-4 px-6 font-black text-[#0F172A]">
                      {formatFCFA(customer.totalSpent)}
                    </td>

                    {/* Preferred Payment */}
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#F1F5F9] text-[#334155]">
                        {customer.preferredPayment}
                      </span>
                    </td>

                    {/* Quick Actions: BOUTONS WHATSAPP (VERT) ET APPEL DIRECT (BLEU DEMANDE UTILISATEUR) */}
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* 1. Bouton WhatsApp avec nom de boutique du marchand */}
                        <a
                          href={`https://wa.me/${customer.whatsappNumber}?text=${waMessage}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#25D366] hover:bg-[#20BA5A] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                          title={`Contacter ${customer.name} sur WhatsApp`}
                        >
                          <WhatsAppIcon className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </a>

                        {/* 2. Bouton Appel Téléphonique Direct - En BLEU avec texte et icône BLANCS */}
                        <a
                          href={`tel:${cleanPhone}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1E60F8] hover:bg-[#164ED0] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer border border-[#164ED0]/30"
                          title={`Appeler directement ${customer.name}`}
                        >
                          <PhoneCall className="w-3.5 h-3.5 text-white" />
                          <span className="text-white">Appeler</span>
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
