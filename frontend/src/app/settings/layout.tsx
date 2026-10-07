// Dark theme of the merchant space: generated colour layer + pre-paint script.
import '../dash-dark.css';
import { THEME_INIT_SCRIPT } from '@/lib/theme-script';

export default function ThemedLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      {children}
    </>
  );
}
