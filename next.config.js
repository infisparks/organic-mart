/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove or comment out the static export setting.
  // output: 'export',
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
};

module.exports = nextConfig;
