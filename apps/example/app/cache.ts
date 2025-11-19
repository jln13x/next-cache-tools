import { createCacheTag, createCacheTagGroup } from "next-cache-tools";

export const standaloneTag = createCacheTag("standalone");

export const dashboardCache = createCacheTagGroup("dashboard", {
  metrics: createCacheTag("metrics"),
  alerts: createCacheTag("alerts"),

  users: {
    profile: createCacheTag("profile", {
      getCacheId: ({ id }: { id: string }) => id,
    }),
  },
});
