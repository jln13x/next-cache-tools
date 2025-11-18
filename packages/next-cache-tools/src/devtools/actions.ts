"use server";

import { refresh, revalidateTag, updateTag } from "next/cache";
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
  const handlersMapSymbol = Symbol.for("@next/cache-handlers-map");
  const handlersMap = (globalThis as any)[handlersMapSymbol] as
    | Map<string, any>
    | undefined;

  if (!handlersMap) {
    throw new Error(
      "next-cache-tools: Cache handlers not initialized. Make sure you have registered the cache handler with Next.js.",
    );
  }
  handlersMap.get("default")?.clear();
}

export async function fetchCacheTagsAction() {
  const tagMap = await getAllCacheTags();

  const tagsArray = Array.from(tagMap.entries())
    .map(([tag, data]) => ({ tag, data }))
    .sort((a, b) => a.tag.localeCompare(b.tag));
  return tagsArray;
}
