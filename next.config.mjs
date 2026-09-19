// @ts-check

/**
 * @type {import('next').NextConfig}
 */

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
