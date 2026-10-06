// Shape of /api/store/notifications (shared by the server and the dashboard).
import type { DashboardTab } from '@/types/juula';

export interface MerchantNotification {
  key: string;
  kind: 'order' | 'payment' | 'action' | 'alert' | 'info';
  title: string;
  summary: string;
  details: string[];
  /** ISO date (sorting). */
  at: string;
  /** Display date (Dakar time). */
  when: string;
  read: boolean;
  /** Where « Voir » leads in the dashboard. */
  target: { tab: DashboardTab; order?: string };
}
