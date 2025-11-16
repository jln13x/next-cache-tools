import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheHandlers: {
    default: require.resolve("next-cache-tools/devtools/cache-handler"),
  },
  cacheLife: {
    "my-custom-profile": {
      stale: 10,
      revalidate: 20,
      expire: 30,
    },
  },
  cacheComponents: true,
};

export default nextConfig;
