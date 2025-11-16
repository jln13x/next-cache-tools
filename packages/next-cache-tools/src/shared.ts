export const GLOBAL_CACHE_TAG = "_nct_";

const PREFIX = "nct_";

export function appendPrefix(tag: string) {
  return `${PREFIX}${tag}`;
}

export function hasPrefix(tag: string): boolean {
  return tag.startsWith(PREFIX);
}

export function stripPrefix(tag: string): string {
  return tag.startsWith(PREFIX) ? tag.substring(PREFIX.length) : tag;
}
