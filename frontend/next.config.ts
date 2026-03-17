import type {NextConfig} from 'next';

const backendOrigin = process.env.BACKEND_ORIGIN || 'http://localhost:3001';
const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api-aiwater.cszj.wang/api';

const nextConfig: NextConfig = {
  /* config options here */
  output: 'export',
  distDir: 'out',
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
  env: {
    NEXT_PUBLIC_API_BASE_URL: apiBaseUrl,
  },
};

export default nextConfig;
