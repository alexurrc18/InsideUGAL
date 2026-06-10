import type { NextConfig } from "next";
import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline' https://maps.googleapis.com https://maps.gstatic.com https://*.maptiler.com;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.maptiler.com;
    img-src 'self' blob: data: https://*.supabase.co https://maps.googleapis.com https://maps.gstatic.com https://*.maptiler.com;
    font-src 'self' data: https://fonts.gstatic.com https://*.maptiler.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    connect-src 'self' https://*.supabase.co https://maps.googleapis.com https://maps.gstatic.com https://*.maptiler.com https://api.maptiler.com https://api.insideugal.ro http://127.0.0.1:8000 http://localhost:8000;
    worker-src blob:;
    upgrade-insecure-requests;
`.replace(/\s{2,}/g, ' ').trim();
const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader,
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;