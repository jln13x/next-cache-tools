import { _tag } from "./cache-handler";

export interface TagData {
  key: string;
  tags: string[];
  timestamp: number;
  expire?: number;
  revalidate?: number;
  stale?: number;
  data?: unknown;
  dataPreview?: string;
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
    for (const [cacheKey, entry] of cacheEntries.entries()) {
      const tagData: TagData = {
        key: cacheKey,
        tags: entry.tags || [],
        timestamp: entry.timestamp,
        expire: entry.expire,
        revalidate: entry.revalidate,
        stale: entry.stale,
        data: undefined,
        dataPreview: undefined,
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

            try {
              const decoder = new TextDecoder();
              const text = decoder.decode(combined);

              const jsonObjects: unknown[] = [];
              const lines = text.split("\n");

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;

                const match = trimmed.match(/^\d+:(?:D)?(\{.*\})$/);
                if (match?.[1]) {
                  try {
                    const jsonObj = JSON.parse(match[1]);
                    jsonObjects.push(jsonObj);
                  } catch {
                    // Not valid JSON
                  }
                } else if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
                  try {
                    const jsonObj = JSON.parse(trimmed);
                    jsonObjects.push(jsonObj);
                  } catch {
                    // Not valid JSON
                  }
                }
              }

              if (jsonObjects.length > 0) {
                tagData.data = jsonObjects[jsonObjects.length - 1];
                tagData.dataPreview = JSON.stringify(tagData.data, null, 2);
                if (tagData.dataPreview.length > 200) {
                  tagData.dataPreview =
                    tagData.dataPreview.substring(0, 200) + "...";
                }
              } else {
                tagData.dataPreview =
                  text.length > 200 ? text.substring(0, 200) + "..." : text;
                tagData.data = text;
              }
            } catch {
              tagData.dataPreview = `Binary data (${combined.length} bytes)`;
              tagData.data = combined;
            }
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
