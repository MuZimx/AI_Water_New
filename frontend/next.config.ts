import type {NextConfig} from 'next';

const backendOrigin = process.env.BACKEND_ORIGIN || 'http://localhost:3001';

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {
    root: __dirname,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendOrigin}/api/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${backendOrigin}/uploads/:path*`,
      },
      {
        source: '/tiles/:path*',
        destination: `${backendOrigin}/tiles/:path*`,
      },
    ];
  },
};

export default nextConfig;
