import { createCacheTag, createCacheTagGroup } from "next-cache-tools";

export const dashboardCache = createCacheTagGroup("dashboard", {
  metrics: createCacheTag({
    cacheKey: () => "metrics",
  }),
  alerts: createCacheTag({
    cacheKey: () => "alerts",
  }),

  users: {
    profile: createCacheTag({
      cacheKey: ({ id }: { id: string }) => id,
    }),
  },
});
