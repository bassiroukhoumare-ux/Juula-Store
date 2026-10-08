import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

// Static security headers applied to every response.
// Set via next.config.ts (not the proxy) so Vercel's edge can serve them
// from the CDN cache without invoking a function — zero per-request latency.
//
// CSP: a baseline policy that blocks the classic injection vectors (<base>
// hijacking, plugins, clickjacking) without restricting script origins —
// merchant storefronts load their own Facebook/TikTok pixels and the Moneriz
// checkout, which a strict script-src would break.
//
// HTTPS-only headers (HSTS, upgrade-insecure-requests) are sent on Vercel
// deployments only: Safari applies upgrade-insecure-requests to
// http://localhost too (Chrome exempts it), so locally every stylesheet and
// script was requested over https:// and the site rendered unstyled.
const httpsOnly = process.env.VERCEL === '1' || process.env.FORCE_HTTPS === '1';

const securityHeaders = [
  ...(httpsOnly
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]
    : []),
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  {
    key: 'Content-Security-Policy',
    value: `base-uri 'self'; object-src 'none'; frame-ancestors 'none'${httpsOnly ? '; upgrade-insecure-requests' : ''}`,
  },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
];

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Standalone output bundles a self-contained server.js + minimal node_modules
  // into .next/standalone — required by the Docker runtime image (frontend/Dockerfile).
  // Has no impact on `next dev` / `next start` workflows.
  output: 'standalone',
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        // Service worker: always fetch the latest version (no HTTP cache).
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/manifest.webmanifest',
        headers: [{ key: 'Content-Type', value: 'application/manifest+json' }],
      },
    ];
  },
};

// Sentry build-time wrapper. Uploads source maps when SENTRY_AUTH_TOKEN +
// SENTRY_ORG + SENTRY_PROJECT are present (typically only in CI). Without
// those env vars the wrapper still works — it just skips the upload step.
// silent:true keeps the build log clean when nothing is configured.
export default withSentryConfig(config, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  // Tunnel client requests through a Next.js route to bypass ad-blockers
  // that filter direct Sentry calls. Off by default — turn on if your
  // user base has heavy ad-blocker usage.
  // tunnelRoute: '/monitoring',
  hideSourceMaps: true,
  disableLogger: true,
});
