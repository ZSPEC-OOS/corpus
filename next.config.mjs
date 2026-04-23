/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true,
  },
  // Keep pdfjs-dist (and its canvas/worker internals) out of the webpack bundle
  // for API routes — it must run as a plain Node.js module on the server.
  serverExternalPackages: ['pdfjs-dist', 'canvas'],
};

export default nextConfig;
