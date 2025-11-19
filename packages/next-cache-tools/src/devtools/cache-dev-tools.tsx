import { Suspense } from "react";
import { CacheTagsPanel } from "./cache-tags-panel";
import type { TagData } from "./get-cache-tags";
import { getAllCacheTags } from "./get-cache-tags";
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
  const entries = await getAllCacheTags();

  const tagMap = new Map<string, TagData[]>();
  for (const entry of entries) {
    for (const tag of entry.tags) {
      if (!tagMap.has(tag)) {
        tagMap.set(tag, []);
      }
      tagMap.get(tag)!.push(entry);
    }
  }

  const tagsArray: TagWithData[] = Array.from(tagMap.entries())
    .map(([tag, data]) => ({ tag, data }))
    .sort((a, b) => a.tag.localeCompare(b.tag));

  return <CacheTagsPanel initialTags={tagsArray} />;
}
