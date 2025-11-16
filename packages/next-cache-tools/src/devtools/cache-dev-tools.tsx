import { Suspense } from "react";
import { CacheTagsPanel } from "./cache-tags-panel";
import type { TagData } from "./getCacheFiles";
import { getAllCacheTags } from "./getCacheFiles";

import "./index.css";

interface TagWithData {
  tag: string;
  data: TagData[];
}

export async function CacheDevTools() {
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

  return <CacheTagsPanel initialTags={tagsArray} />;
}
