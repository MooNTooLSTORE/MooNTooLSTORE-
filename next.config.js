/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  // Adding a comment to invalidate the cache.
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.jsdelivr.net',
        port: '',
        pathname: '**',
      },
    ],
  },
};

module.exports = nextConfig;
