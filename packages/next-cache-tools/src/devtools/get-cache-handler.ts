import type { CacheHandler } from "next/dist/server/lib/cache-handlers/types";
import { _tag } from "./cache-handler";

export function getCacheHandler() {
  const handlersMapSymbol = Symbol.for("@next/cache-handlers-map");
  const handlersMap = (globalThis as any)[handlersMapSymbol] as
    | Map<string, any>
    | undefined;

  if (!handlersMap) {
    throw new Error(
      "next-cache-tools: Cache handlers not initialized. Make sure you have registered the cache handler with Next.js.",
    );
  }

  const defaultHandler = handlersMap.get("default");

  if (defaultHandler._tag !== _tag) {
    throw new Error(
      "next-cache-tools: The cache handler registered with Next.js is not the next-cache-tools handler. Please ensure you have properly configured next-cache-tools.",
    );
  }

  return defaultHandler as CacheHandler & {
    getCacheEntries: () => any;
    clear: () => void;
    getVersion: () => number | undefined;
  };
}
