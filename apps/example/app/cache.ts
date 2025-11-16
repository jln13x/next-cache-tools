import { createCacheTag, createCacheTagGroup } from "next-cache-tools";

export const byIdCacheKey = createCacheTag({
  cacheKey: ({ id }: { id: string }) => id,
});

export const cacheGroup = createCacheTagGroup("users", {
  user: {
    byId: createCacheTag({
      cacheKey: ({ id }: { id: string }) => id,
    }),
  },
});
