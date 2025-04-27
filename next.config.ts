import type { NextConfig } from 'next';
import type { Configuration as WebpackConfig } from 'webpack';

const nextConfig: NextConfig = {
  webpack: (config: WebpackConfig, { isServer }: { isServer: boolean }) => {
    if (!isServer) {
      config.resolve = config.resolve || {};
      config.resolve.fallback = {
        ...config.resolve.fallback,
        "child_process": false,
      };
    }
    return config;
  },
};

export default nextConfig;