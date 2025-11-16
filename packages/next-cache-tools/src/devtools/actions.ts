"use server";

import { refresh, revalidateTag, updateTag } from "next/cache";
import { getAllCacheTags } from "./getCacheFiles";

export async function revalidateTagAction(tag: string) {
  revalidateTag(tag, "default");
}

export async function updateTagAction(tag: string) {
  updateTag(tag);
}

export async function refreshAction() {
  refresh();
}

export async function fetchCacheTagsAction() {
  const tagMap = await getAllCacheTags();
  console.log("[fetchCacheTagsAction] tagMap", tagMap);

  const tagsArray = Array.from(tagMap.entries())
    .map(([tag, data]) => ({ tag, data }))
    .sort((a, b) => a.tag.localeCompare(b.tag));
  return tagsArray;
}
