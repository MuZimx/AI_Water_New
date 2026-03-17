import type {NextConfig} from 'next';

const backendOrigin = process.env.BACKEND_ORIGIN || 'http://localhost:3001';
const isStaticExportBuild = process.env.BUILD_ANDROID_STATIC === 'true';

const nextConfig: NextConfig = {
  /* config options here */
  ...(isStaticExportBuild ? { output: 'export' } : {}),
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
    if (isStaticExportBuild) {
      return [];
    }

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
