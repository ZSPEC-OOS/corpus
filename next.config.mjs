/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    typedRoutes: true,
  },
  serverExternalPackages: ['pdfjs-dist', 'canvas', '@anthropic-ai/sdk'],
};

export default nextConfig;
