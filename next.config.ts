import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Environment variables exposed to the browser (prefix with NEXT_PUBLIC_)
  // Server-only env vars are accessed directly via process.env
};

export default nextConfig;
