import { getCacheHandler } from "./get-cache-handler";

export interface TagData {
  key: string;
  tags: string[];
  timestamp: number;
  expire: number;
  revalidate: number;
  stale: number;
  data?: unknown;
}

async function getInMemoryTags(): Promise<TagData[]> {
  const entries: TagData[] = [];

  const handler = getCacheHandler();

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

      entries.push(tagData);
    }
  }

  const deduplicatedMap = new Map<string, TagData>();

  for (const entry of entries) {
    try {
      const keyParts = JSON.parse(entry.key) as unknown[];
      if (Array.isArray(keyParts) && keyParts.length >= 3) {
        const groupKey = JSON.stringify([keyParts[1], keyParts[2]]);

        const existing = deduplicatedMap.get(groupKey);
        if (!existing || entry.timestamp > existing.timestamp) {
          deduplicatedMap.set(groupKey, entry);
        }
      } else {
        deduplicatedMap.set(entry.key, entry);
      }
    } catch {
      deduplicatedMap.set(entry.key, entry);
    }
  }

  return Array.from(deduplicatedMap.values());
}

export const getAllCacheTags = async (): Promise<TagData[]> => {
  return getInMemoryTags();
};
