import { Suspense } from "react";
import { OpenDevtools } from "./CacheTagsPanel";
import type { TagData } from "./getCacheFiles";
import { getAllCacheTags } from "./getCacheFiles";

interface TagWithData {
  tag: string;
  data: TagData[];
}

export async function NextCacheToolsDevtools() {
  if (process.env["NODE_ENV"] !== "development") {
    return null;
  }

  return (
    <Suspense>
      <Devtools />
    </Suspense>
  );
}

async function Devtools() {
  const tagMap = await getAllCacheTags();
  const tagsArray: TagWithData[] = Array.from(tagMap.entries())
    .map(([tag, data]: [string, TagData[]]) => ({ tag, data }))
    .sort((a, b) => a.tag.localeCompare(b.tag));

  return <OpenDevtools initialTags={tagsArray} />;
}
