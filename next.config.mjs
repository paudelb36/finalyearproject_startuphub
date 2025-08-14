/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Optimize package imports for better performance
    optimizePackageImports: ['@supabase/supabase-js', 'zustand', 'react-hot-toast']
  },
  
  // Reduce bundle size
  compress: true,
}

export default nextConfig
