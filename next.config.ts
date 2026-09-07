import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  agentRules: false,
  experimental: { turbopackFileSystemCacheForBuild: false },
};
export default nextConfig;
