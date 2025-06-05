/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  serverExternalPackages: ['mysql2'], // Mis à jour depuis experimental.serverComponentsExternalPackages
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Disable image optimization for simpler deployment
  images: {
    unoptimized: true
  },
  // Be more permissive with external packages
  transpilePackages: ['lucide-react'],
  // Handle potential import issues
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
      skipDefaultConversion: true
    }
  }
}

export default nextConfig