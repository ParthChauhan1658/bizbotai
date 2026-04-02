import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@bizbot/database', '@bizbot/shared', '@bizbot/trpc'],
}

export default nextConfig
