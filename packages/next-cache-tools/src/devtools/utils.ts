import type { TagData } from "./getCacheFiles";

export interface TagWithData {
  tag: string;
  data: TagData[];
}

export interface GroupedTags {
  groupName: string;
  tags: TagWithData[];
}

export function formatDuration(value: number): string {
  const seconds = value > 1000000 ? Math.floor(value / 1000) : value;
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (days > 0) return `${days} ${days === 1 ? "day" : "days"}`;
  if (hours > 0) return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  if (minutes > 0) return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
  return `${secs} ${secs === 1 ? "second" : "seconds"}`;
}

export function formatTagForDisplay(tag: string): string {
  const colonIndex = tag.indexOf(":");
  if (colonIndex === -1) return tag;
  return tag.substring(colonIndex + 1);
}

export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function getEntryBadgeType(
  entry: TagData,
  now: number = Date.now(),
): "fresh" | "stale" | "expired" | null {
  if (entry.expire !== undefined) {
    const expireTime = entry.timestamp + entry.expire * 1000;
    if (expireTime < now) {
      return "expired";
    }
  }

  if (entry.stale !== undefined) {
    const staleTime = entry.timestamp + entry.stale * 1000;
    if (staleTime < now) {
      return "stale";
    }
    return "fresh";
  }

  return null;
}

export function getEntryCounts(
  data: TagData[],
  now: number = Date.now(),
): {
  fresh: number;
  stale: number;
  expired: number;
} {
  const counts = { fresh: 0, stale: 0, expired: 0 };

  data.forEach((entry) => {
    const badgeType = getEntryBadgeType(entry, now);
    if (badgeType === "fresh") {
      counts.fresh++;
    } else if (badgeType === "stale") {
      counts.stale++;
    } else if (badgeType === "expired") {
      counts.expired++;
    }
  });

  return counts;
}

export function isTagOutdated(
  tag: TagWithData,
  memoryCacheTags: TagWithData[] | null,
): boolean {
  if (!memoryCacheTags) return false;

  const memoryTag = memoryCacheTags.find((mt) => mt.tag === tag.tag);
  if (!memoryTag) return true;

  const memoryDataByKeys = new Map<string, TagData>();
  memoryTag.data.forEach((d) => {
    memoryDataByKeys.set(d.key, d);
  });

  const anyDataOutdated = tag.data.some((d) => {
    const memoryData = memoryDataByKeys.get(d.key);
    return memoryData ? d.timestamp < memoryData.timestamp : true;
  });

  return anyDataOutdated;
}

export function processTags(
  tagList: TagWithData[],
  stripPrefix: (s: string) => string,
): {
  standalone: TagWithData[];
  groupedArray: GroupedTags[];
} {
  const standalone = tagList.filter(({ tag }) => !tag.includes(":"));

  const grouped = tagList
    .filter(({ tag }) => tag.includes(":"))
    .reduce((acc, tagWithData) => {
      const tag = tagWithData.tag;
      const colonIndex = tag.indexOf(":");
      const prefixedGroupName = tag.substring(0, colonIndex);
      const groupName = stripPrefix(prefixedGroupName);

      if (!acc.has(groupName)) {
        acc.set(groupName, []);
      }
      const groupTags = acc.get(groupName);
      if (groupTags) {
        groupTags.push(tagWithData);
      }
      return acc;
    }, new Map<string, TagWithData[]>());

  const groupedArray: GroupedTags[] = Array.from(grouped.entries())
    .map(([groupName, tags]) => ({
      groupName,
      tags: tags.sort((a, b) => a.tag.localeCompare(b.tag)),
    }))
    .sort((a, b) => a.groupName.localeCompare(b.groupName));

  return { standalone, groupedArray };
}
