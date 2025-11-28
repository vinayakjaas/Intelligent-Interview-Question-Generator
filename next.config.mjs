/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable static optimization for pages that use client-only libraries
  output: 'standalone',
};

export default nextConfig;
