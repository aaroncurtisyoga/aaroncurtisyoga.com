// @ts-check

/**
 * @type {import('next').NextConfig}
 */

/**
 * Content Security Policy.
 *
 * Hosts here were taken from what the built bundles and the running pages
 * actually contact, not from guesswork. If you add a third-party script, map
 * provider or image host, it has to be listed or the browser drops it silently.
 *
 * Two deliberate weak spots:
 *   - `unsafe-inline` in script-src, because Next's hydration payload is an
 *     inline script on every page. Removing it means per-request nonces, which
 *     makes every route dynamic and costs the newsletter page its ISR.
 *   - `unsafe-eval`, which Clerk's sign-in widget needs. Dropping it breaks
 *     sign-in, and sign-in is the only way into /admin.
 * Both are worth revisiting, but the policy still does the main job: it stops a
 * script or a fetch from an origin that isn't on this list.
 *
 * Stripe is deliberately absent. Payments are parked (app/_lib/dormant.ts); add
 * https://js.stripe.com to script-src and frame-src when they come back.
 */
const clerk =
  "https://clerk.aaroncurtisyoga.com https://*.clerk.accounts.dev https://*.clerk.com";

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${clerk} https://challenges.cloudflare.com https://maps.googleapis.com https://va.vercel-scripts.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://img.clerk.com https://images.clerk.dev https://*.public.blob.vercel-storage.com https://maps.googleapis.com https://maps.gstatic.com https://*.googleapis.com https://*.ggpht.com",
  "font-src 'self' data:",
  `connect-src 'self' ${clerk} https://clerk-telemetry.com https://maps.googleapis.com https://vitals.vercel-insights.com`,
  `frame-src 'self' ${clerk} https://challenges.cloudflare.com`,
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  `form-action 'self' ${clerk}`,
  // Matches the X-Frame-Options: DENY below, for browsers that prefer CSP.
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig = {
  images: {
    // Hostname alone lets the optimizer fetch over http and from any path.
    // Pinning the protocol costs nothing. No `search: ""` here: Clerk avatar
    // URLs carry query parameters and would stop resolving.
    // covers.openlibrary.org is gone with the unwired Book model.
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      { protocol: "https", hostname: "img.clerk.com" },
      { protocol: "https", hostname: "images.clerk.dev" },
    ],
    qualities: [50, 75, 80, 90, 100],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
