import { _tag } from "./cache-handler";

export interface TagData {
  key: string;
  tags: string[];
  timestamp: number;
  expire: number;
  revalidate: number;
  stale: number;
  data?: unknown;
}

async function getInMemoryTags(): Promise<Map<string, TagData[]>> {
  const tagMap = new Map<string, TagData[]>();

  // Get entries from Next.js cache handler (from global symbol)
  const handlersMapSymbol = Symbol.for("@next/cache-handlers-map");
  const handlersMap = (globalThis as any)[handlersMapSymbol] as
    | Map<string, any>
    | undefined;

  if (!handlersMap) {
    throw new Error(
      "next-cache-tools: Cache handlers not initialized. Make sure you have registered the cache handler with Next.js.",
    );
  }

  const handler = handlersMap.get("default");

  if (handler._tag !== _tag) {
    throw new Error(
      "next-cache-tools: The cache handler registered with Next.js is not the next-cache-tools handler. Please ensure you have properly configured next-cache-tools.",
    );
  }

  const cacheEntries = handler.getCacheEntries();

  if (cacheEntries.size > 0) {
    for (const [cacheKey, node] of cacheEntries.entries()) {
      const privateEntry = node.data;
      const entry = privateEntry.entry;

      const tagData: TagData = {
        key: cacheKey,
        tags: entry.tags || [],
        timestamp: entry.timestamp,
        expire: entry.expire,
        revalidate: entry.revalidate,
        stale: entry.stale,
        data: undefined,
      };

      // Read stream data if available
      if (entry.value && !entry.value.locked) {
        try {
          const [stream1, stream2] = entry.value.tee();
          entry.value = stream2;

          const reader = stream1.getReader();
          const chunks: Uint8Array[] = [];
          let done = false;

          while (!done) {
            const result = await reader.read();
            done = result.done;
            if (result.value) {
              chunks.push(result.value);
            }
          }
          reader.releaseLock();

          if (chunks.length > 0) {
            const totalLength = chunks.reduce(
              (sum, chunk) => sum + chunk.length,
              0,
            );
            const combined = new Uint8Array(totalLength);
            let offset = 0;
            for (const chunk of chunks) {
              combined.set(chunk, offset);
              offset += chunk.length;
            }

            const decoder = new TextDecoder();
            const text = decoder.decode(combined);
            const lines = text.trim().split("\n");

            const lastLine = lines.at(-1);
            if (!lastLine) {
              throw new Error("next-cache-tools: Failed to read stream");
            }

            tagData.data = lastLine.trim().slice(2);
          }
        } catch {
          // Failed to read stream
        }
      }

      // Add entry to tags
      for (const tag of tagData.tags) {
        if (!tagMap.has(tag)) {
          tagMap.set(tag, []);
        }
        const tagEntries = tagMap.get(tag);
        if (tagEntries) {
          tagEntries.push(tagData);
        }
      }
    }
  }

  return tagMap;
}

export const getAllCacheTags = async (): Promise<Map<string, TagData[]>> => {
  return getInMemoryTags();
};
