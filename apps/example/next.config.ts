import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheHandlers: {
    default: require.resolve("next-cache-tools/devtools/cache-handler"),
  },
  cacheComponents: true,
};

export default nextConfig;
