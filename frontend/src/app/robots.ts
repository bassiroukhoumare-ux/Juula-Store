import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { platformOrigin, subdomainFromHost } from '@/lib/store/subdomain';

// Served on www AND on every <shop>.juula.store (the middleware never rewrites
// dotted paths). Each host points to the single platform sitemap: listing a
// cross-host sitemap in the target host's robots.txt is what makes Google
// accept the shop URLs it contains.
export default async function robots(): Promise<MetadataRoute.Robots> {
  const onShop = Boolean(subdomainFromHost((await headers()).get('host')));
  const disallow = onShop
    ? ['/panier', '/commande', '/signaler', '/partner/']
    : [
        '/api/',
        '/dashboard',
        '/settings',
        '/adminom',
        '/auth/',
        '/signaler',
        '/vitrine',
        '/pay-redirect',
        '/boutique/*/panier',
        '/boutique/*/commande',
        '/boutique/*/signaler',
        '/boutique/*/partner/',
      ];
  return {
    rules: [{ userAgent: '*', allow: '/', disallow }],
    sitemap: `${platformOrigin()}/sitemap.xml`,
  };
}
