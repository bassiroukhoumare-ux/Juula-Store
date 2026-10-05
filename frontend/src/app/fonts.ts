// Display font shared by the landing page, auth screens and dashboard.
import { Urbanist } from 'next/font/google';

export const displayFont = Urbanist({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});
