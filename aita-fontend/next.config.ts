import type { NextConfig } from "next";

const rawApiTarget = process.env.API_PROXY_TARGET || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';
const apiTarget = rawApiTarget.replace(/\/api\/?$/, '').replace(/\/+$/, '');

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
  async redirects() {
    return [
      ...['admin', 'lecturer', 'student'].map(role => ({
        source: `/${role}/profile`,
        destination: '/profile',
        permanent: false,
      })),
      {
        source: '/lecturer/grading/upload',
        destination: '/lecturer/grading/hub',
        permanent: false,
      },
      {
        source: '/admin/exams',
        destination: '/admin',
        permanent: false,
      },
      {
        source: '/admin/audit-logs',
        destination: '/admin',
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${apiTarget}/api/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${apiTarget}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
