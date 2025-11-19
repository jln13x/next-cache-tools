"use server";

import { refresh, revalidateTag, updateTag } from "next/cache";
import { getCacheHandler } from "./get-cache-handler";
import { getAllCacheTags } from "./get-cache-tags";

export async function revalidateTagAction(tag: string) {
  revalidateTag(tag, "default");
}

export async function updateTagAction(tag: string) {
  updateTag(tag);
}

export async function refreshAction() {
  refresh();
}

export async function clearCacheAction() {
  getCacheHandler().clear();
}

export async function fetchCacheTagsAction() {
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

  const tagsArray = Array.from(tagMap.entries())
    .map(([tag, data]) => ({ tag, data }))
    .sort((a, b) => a.tag.localeCompare(b.tag));
  return tagsArray;
}
