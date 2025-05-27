/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['lucide-react', '@radix-ui/react-progress'],
  webpack(config) {
    config.module.rules.push({
      test: /\.js$/,
      include: /node_modules\/@radix-ui\/react-progress/,
      use: {
        loader: 'babel-loader',
        options: {
          presets: ['next/babel'],
        },
      },
    });
    return config;
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true, // 👈 Add this line
  },
};

module.exports = nextConfig;
