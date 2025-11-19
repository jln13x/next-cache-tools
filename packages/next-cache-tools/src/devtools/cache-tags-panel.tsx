"use client";

import dynamic from "next/dynamic";
import React, {
  type ComponentType,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { createPortal } from "react-dom";
import { GLOBAL_CACHE_TAG, hasPrefix, stripPrefix } from "../shared";
import {
  clearCacheAction,
  fetchCacheTagsAction,
  revalidateTagAction,
  updateTagAction,
} from "./actions";
import type { TagData } from "./get-cache-tags";
import { Logo } from "./logo";
import { TagGroup } from "./tag-group";
import {
  isTagOutdated as checkTagOutdated,
  formatDuration,
  formatTagForDisplay,
  formatTimestamp,
  getEntryBadgeType,
  getEntryCounts,
  processTags,
  type TagWithData,
} from "./utils";
import "./index.css";

function OpenButton({ onExpand }: { onExpand: () => void }) {
  return (
    <button
      type="button"
      onClick={onExpand}
      className="fixed bottom-4 right-4 px-4 py-2 bg-background border border-border text-foreground rounded cursor-pointer z-[10000] hover:opacity-80 transition-opacity"
      aria-label="Open Next Cache Tools"
    >
      <Logo />
    </button>
  );
}

function Panel({
  initialTags,
  onClose,
}: {
  initialTags: TagWithData[];
  onClose: () => void;
}) {
  const [tags, setTags] = useState<TagWithData[]>(initialTags);
  const [memoryCacheTags, setMemoryCacheTags] = useState<TagWithData[] | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [invalidatedTags, setInvalidatedTags] = useState<Map<string, number>>(
    new Map(),
  );
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const filteredTags = tags.filter(
    ({ tag }) =>
      tag !== GLOBAL_CACHE_TAG &&
      tag.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const nctTags = filteredTags.filter(({ tag }) => hasPrefix(tag));
  const externalTags = filteredTags.filter(({ tag }) => !hasPrefix(tag));

  const nctProcessed = processTags(nctTags, stripPrefix);
  const externalProcessed = processTags(externalTags, stripPrefix);

  const handleTagInvalidated = (tag: string) => {
    const now = Date.now();
    setInvalidatedTags((prev) => {
      const newMap = new Map(prev);
      newMap.set(tag, now);
      return newMap;
    });
  };

  const handleInvalidateAll = () => {
    const now = Date.now();
    setInvalidatedTags((prev) => {
      const newMap = new Map(prev);
      filteredTags.forEach(({ tag }) => {
        newMap.set(tag, now);
      });
      return newMap;
    });
  };

  const handleTagUpdated = async (tag: string) => {
    const updatedTags = await fetchCacheTagsAction();
    const updatedTagData = updatedTags.find((t) => t.tag === tag);
    if (updatedTagData) {
      setTags((prev) => {
        const newTags = [...prev];
        const index = newTags.findIndex((t) => t.tag === tag);
        if (index !== -1) {
          newTags[index] = updatedTagData;
        } else {
          newTags.push(updatedTagData);
        }
        return newTags;
      });
      setMemoryCacheTags((prev) => {
        if (!prev) return prev;
        const newMemoryTags = [...prev];
        const index = newMemoryTags.findIndex((t) => t.tag === tag);
        if (index !== -1) {
          newMemoryTags[index] = updatedTagData;
        } else {
          newMemoryTags.push(updatedTagData);
        }
        return newMemoryTags;
      });
      setInvalidatedTags((prev) => {
        const newMap = new Map(prev);
        newMap.delete(tag);
        return newMap;
      });
    }
  };

  const handleGroupUpdated = async (tagsToUpdate: string[]) => {
    const updatedTags = await fetchCacheTagsAction();
    setTags((prev) => {
      const newTags = [...prev];
      tagsToUpdate.forEach((tag) => {
        const updatedTagData = updatedTags.find((t) => t.tag === tag);
        if (updatedTagData) {
          const index = newTags.findIndex((t) => t.tag === tag);
          if (index !== -1) {
            newTags[index] = updatedTagData;
          } else {
            newTags.push(updatedTagData);
          }
        }
      });
      return newTags;
    });
    setMemoryCacheTags((prev) => {
      if (!prev) return prev;
      const newMemoryTags = [...prev];
      tagsToUpdate.forEach((tag) => {
        const updatedTagData = updatedTags.find((t) => t.tag === tag);
        if (updatedTagData) {
          const index = newMemoryTags.findIndex((t) => t.tag === tag);
          if (index !== -1) {
            newMemoryTags[index] = updatedTagData;
          } else {
            newMemoryTags.push(updatedTagData);
          }
        }
      });
      return newMemoryTags;
    });
    setInvalidatedTags((prev) => {
      const newMap = new Map(prev);
      tagsToUpdate.forEach((tag) => {
        newMap.delete(tag);
      });
      return newMap;
    });
  };

  const handleLiveMemoryCache = useCallback(async () => {
    const memoryTags = await fetchCacheTagsAction();
    setMemoryCacheTags(memoryTags);
  }, []);

  const handleRefreshTag = useCallback(
    (tag: string) => {
      if (!memoryCacheTags) return;
      const liveTagData = memoryCacheTags.find((t) => t.tag === tag);
      if (!liveTagData) return;
      setTags((prev) => {
        const newTags = [...prev];
        const index = newTags.findIndex((t) => t.tag === tag);
        if (index !== -1) {
          newTags[index] = liveTagData;
        } else {
          newTags.push(liveTagData);
        }
        return newTags;
      });
      setInvalidatedTags((prev) => {
        const newMap = new Map(prev);
        newMap.delete(tag);
        return newMap;
      });
    },
    [memoryCacheTags],
  );

  const handleCacheCleared = async () => {
    const updatedTags = await fetchCacheTagsAction();
    setTags(updatedTags);
    setInvalidatedTags(new Map());
  };

  const isTagOutdated = useCallback(
    (t: TagWithData) => {
      return checkTagOutdated(t, memoryCacheTags);
    },
    [memoryCacheTags],
  );

  const handleRefreshOutdated = useCallback(() => {
    const outdatedTags = tags.filter((t) => isTagOutdated(t));

    outdatedTags.forEach((t) => {
      handleRefreshTag(t.tag);
    });
  }, [tags, handleRefreshTag, isTagOutdated]);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 max-h-[50vh] z-[10000] flex flex-col overflow-hidden">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-3">
          <Logo />
        </div>
        <div className="flex gap-2 items-center">
          <PollMemoryCacheButton onLive={handleLiveMemoryCache} />
          {memoryCacheTags && filteredTags.some((t) => isTagOutdated(t)) && (
            <Button
              variant="secondary"
              type="button"
              onClick={handleRefreshOutdated}
              className="px-3 py-2 font-medium"
            >
              Refresh Outdated
            </Button>
          )}
          <ClearCacheButton onCleared={handleCacheCleared} />
          <RevalidateAllButton onInvalidated={handleInvalidateAll} />
          <UpdateAllButton
            tags={filteredTags.map(({ tag }) => tag)}
            onUpdated={() =>
              handleGroupUpdated(filteredTags.map(({ tag }) => tag))
            }
          />
          <Button
            variant="secondary"
            type="button"
            onClick={onClose}
            className="px-3 py-2 font-medium"
          >
            Close
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden flex gap-4">
        <div className="flex-1 overflow-hidden flex flex-col">
          <input
            type="text"
            placeholder="Search tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-2 mb-4 border border-border rounded bg-muted text-muted-foreground outline-none"
          />
          <div className="flex-1 overflow-auto">
            {nctProcessed.standalone.length > 0 ||
            nctProcessed.groupedArray.length > 0 ||
            externalProcessed.standalone.length > 0 ? (
              <>
                {(nctProcessed.standalone.length > 0 ||
                  nctProcessed.groupedArray.length > 0) && (
                  <ul className="list-none p-0 m-0">
                    {nctProcessed.standalone
                      .sort((a, b) => a.tag.localeCompare(b.tag))
                      .map(({ tag, data }) => (
                        <li key={tag} className="p-0 border-b border-border">
                          <Tag
                            tag={tag}
                            data={data}
                            isInvalidated={invalidatedTags.has(tag)}
                            isSelected={selectedTag === tag}
                            onClick={() => setSelectedTag(tag)}
                            currentTime={currentTime}
                            isOutdated={isTagOutdated({ tag, data })}
                          />
                        </li>
                      ))}
                    {nctProcessed.groupedArray.map(({ groupName, tags }) => (
                      <TagGroup
                        key={groupName}
                        groupName={groupName}
                        tags={tags}
                        selectedTag={selectedTag}
                        invalidatedTags={invalidatedTags}
                        currentTime={currentTime}
                        onTagSelect={setSelectedTag}
                        onTagInvalidated={handleTagInvalidated}
                        onGroupUpdated={handleGroupUpdated}
                        isTagOutdated={isTagOutdated}
                      />
                    ))}
                  </ul>
                )}
                {externalProcessed.standalone.length > 0 && (
                  <ExternalTags
                    externalProcessed={externalProcessed}
                    selectedTag={selectedTag}
                    invalidatedTags={invalidatedTags}
                    currentTime={currentTime}
                    onTagSelect={setSelectedTag}
                    isTagOutdated={isTagOutdated}
                  />
                )}
              </>
            ) : (
              <div className="text-muted-foreground">No tags found</div>
            )}
          </div>
        </div>
        {selectedTag && (
          <TagPreview
            selectedTag={selectedTag}
            tags={tags}
            invalidatedTags={invalidatedTags}
            onTagInvalidated={handleTagInvalidated}
            onTagUpdated={handleTagUpdated}
            currentTime={currentTime}
            isTagOutdated={isTagOutdated}
            memoryCacheTags={memoryCacheTags}
            onTagRefreshed={handleRefreshTag}
          />
        )}
      </div>
    </div>
  );
}

function ExternalTags({
  externalProcessed,
  selectedTag,
  invalidatedTags,
  currentTime,
  onTagSelect,
  isTagOutdated,
}: {
  externalProcessed: {
    standalone: TagWithData[];
  };
  selectedTag: string | null;
  invalidatedTags: Map<string, number>;
  currentTime: number;
  onTagSelect: (tag: string) => void;
  isTagOutdated: (t: TagWithData) => boolean;
}) {
  if (externalProcessed.standalone.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 pt-6 border-t border-border">
      <div className="mb-4">
        <h3 className="text-white font-semibold text-base m-0 mb-1">
          External
        </h3>
        <p className="text-muted-foreground text-sm m-0">
          Cache Tags not managed by nct
        </p>
      </div>
      <ul className="list-none p-0 m-0">
        {externalProcessed.standalone
          .sort((a, b) => a.tag.localeCompare(b.tag))
          .map(({ tag, data }) => (
            <li key={tag} className="p-0 border-b border-border">
              <Tag
                tag={tag}
                data={data}
                isInvalidated={invalidatedTags.has(tag)}
                isSelected={selectedTag === tag}
                onClick={() => onTagSelect(tag)}
                currentTime={currentTime}
                isOutdated={isTagOutdated({ tag, data })}
              />
            </li>
          ))}
      </ul>
    </div>
  );
}

function TagPreview({
  selectedTag,
  tags,
  invalidatedTags,
  onTagInvalidated,
  onTagUpdated,
  currentTime,
  isTagOutdated,
  memoryCacheTags,
  onTagRefreshed,
}: {
  selectedTag: string;
  tags: TagWithData[];
  invalidatedTags: Map<string, number>;
  onTagInvalidated: (tag: string) => void;
  onTagUpdated: (tag: string) => Promise<void>;
  currentTime: number;
  isTagOutdated: (t: TagWithData) => boolean;
  memoryCacheTags: TagWithData[] | null;
  onTagRefreshed: (tag: string) => void;
}) {
  const tagData = tags.find((t) => t.tag === selectedTag);

  if (!tagData || tagData.data.length === 0) {
    return (
      <div className="flex-1 overflow-auto bg-muted rounded p-4">
        <div className="text-muted-foreground">No data for this tag</div>
      </div>
    );
  }

  const colonIndex = selectedTag.indexOf(":");
  const groupName =
    colonIndex !== -1
      ? stripPrefix(selectedTag.substring(0, colonIndex))
      : null;

  return (
    <div className="flex-1 overflow-auto bg-muted rounded p-4">
      <div>
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <div className="flex-1">
            {groupName && (
              <div className="text-xs text-muted-foreground opacity-60 mb-1">
                {groupName}
              </div>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-white m-0 text-2xl font-bold">
                {formatTagForDisplay(selectedTag)}
              </h3>
              {invalidatedTags.has(selectedTag) && <InvalidatedIcon />}
              {isTagOutdated({ tag: selectedTag, data: tagData.data }) && (
                <OutdatedIcon />
              )}
            </div>
            {invalidatedTags.has(selectedTag) && (
              <p className="text-xs text-[#88ccff] bg-[#88ccff]/10 m-0 mt-1 px-2 py-1 rounded">
                This tag will be revalidated in the background upon next
                execution.
              </p>
            )}
          </div>
          <RevalidateButton
            tag={selectedTag}
            onInvalidated={() => onTagInvalidated(selectedTag)}
          />
          {memoryCacheTags &&
            isTagOutdated({ tag: selectedTag, data: tagData.data }) && (
              <RefreshButton onRefreshed={() => onTagRefreshed(selectedTag)} />
            )}
          <UpdateButton
            tag={selectedTag}
            onUpdated={() => onTagUpdated(selectedTag)}
          />
        </div>
        <div className="mt-6 mb-4 pb-2 border-b border-border">
          <h4 className="text-white m-0 text-base font-semibold">
            Cache Entries ({tagData.data.length})
          </h4>
          <div className="text-xs text-muted-foreground mt-1">
            These are the cached data entries attached to this tag
          </div>
        </div>
        {tagData.data.map((entry, idx) => {
          const badgeType = getEntryBadgeType(entry, currentTime);
          return (
            <div
              key={`${entry.key}-${entry.timestamp}-${idx}`}
              className={`${idx < tagData.data.length - 1 ? "mb-6 pb-6 border-b border-border" : ""} bg-background p-4 rounded`}
            >
              <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  {badgeType && <Badge type={badgeType} />}
                </div>
                <div className="text-xs text-muted-foreground">
                  Cached at: {formatTimestamp(entry.timestamp)}
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {entry.data !== undefined && <DataPreview data={entry.data} />}
                <div className="flex gap-4 flex-wrap mt-2 text-xs text-muted-foreground">
                  <span>
                    <strong>Expiry:</strong> {formatDuration(entry.expire)}
                  </span>
                  <span>
                    <strong>Revalidate:</strong>{" "}
                    {formatDuration(entry.revalidate)}
                  </span>
                  <span>
                    <strong>Stale:</strong> {formatDuration(entry.stale)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function parseData(data: unknown) {
  try {
    return JSON.parse(data as string);
  } catch {
    return data;
  }
}

function DataPreview({ data }: { data: unknown }) {
  const parsedData = useMemo(() => {
    return parseData(data);
  }, [data]);
  return (
    <pre className="m-0 text-xs text-muted-foreground whitespace-pre-wrap break-words bg-muted p-2 rounded max-h-[300px] overflow-auto">
      {typeof parsedData === "string"
        ? parsedData
        : JSON.stringify(parsedData, null, 2)}
    </pre>
  );
}

export function Tag({
  tag,
  data,
  isInvalidated,
  isSelected,
  onClick,
  currentTime,
  isOutdated,
}: {
  tag: string;
  data: TagData[];
  isInvalidated: boolean;
  isSelected: boolean;
  onClick: () => void;
  currentTime: number;
  isOutdated?: boolean;
}) {
  const entryCounts = getEntryCounts(data, currentTime);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full p-2 bg-transparent rounded cursor-pointer text-left ${isSelected ? "border-2 border-[#4a9eff]" : "border-none"}`}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <code className="bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded flex-1 flex items-center gap-2 justify-between">
          {formatTagForDisplay(tag)}
          <div className="flex items-center gap-1.5 flex-wrap">
            {entryCounts.fresh > 0 && (
              <BadgeWithCount type="fresh" count={entryCounts.fresh} />
            )}
            {entryCounts.stale > 0 && (
              <BadgeWithCount type="stale" count={entryCounts.stale} />
            )}
            {entryCounts.expired > 0 && (
              <BadgeWithCount type="expired" count={entryCounts.expired} />
            )}
            {isInvalidated && <InvalidatedIcon />}
            {isOutdated && <OutdatedIcon />}
          </div>
        </code>
      </div>
    </button>
  );
}

function CacheTagsPanelImplInner({
  initialTags,
}: {
  initialTags: TagWithData[];
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (isExpanded) {
    return (
      <Panel initialTags={initialTags} onClose={() => setIsExpanded(false)} />
    );
  }

  return <OpenButton onExpand={() => setIsExpanded(true)} />;
}

function Button({
  variant = "default",
  className = "",
  children,
  ...props
}: {
  variant?: "default" | "secondary";
  className?: string;
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const variantClasses = {
    default: "bg-primary text-primary-foreground border border-primary",
    secondary: "bg-secondary text-secondary-foreground border border-border",
  };

  return (
    <button
      className={`px-2.5 py-1.5 font-bold text-sm rounded cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function InvalidatedIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-[#88ccff]"
      aria-label="Invalidated"
    >
      <title>Invalidated</title>
      <path
        d="M6 1.5C3.51562 1.5 1.5 3.51562 1.5 6C1.5 8.48438 3.51562 10.5 6 10.5C8.48438 10.5 10.5 8.48438 10.5 6C10.5 3.51562 8.48438 1.5 6 1.5ZM6 9.75C4.20508 9.75 2.75 8.29492 2.75 6C2.75 3.70508 4.20508 2.25 6 2.25C7.79492 2.25 9.25 3.70508 9.25 6C9.25 8.29492 7.79492 9.75 6 9.75Z"
        fill="currentColor"
      />
      <path
        d="M8.25 3.75L9.53033 2.46967L10.2197 3.15901L8.93934 4.43934L8.25 3.75ZM3.75 3.75L2.46967 2.46967L1.78033 3.15901L3.06066 4.43934L3.75 3.75ZM6 2.25V3.75H6.75V2.25H6Z"
        fill="currentColor"
      />
      <path
        d="M8.25 8.25L9.53033 9.53033L10.2197 8.84099L8.93934 7.56066L8.25 8.25ZM3.75 8.25L2.46967 9.53033L1.78033 8.84099L3.06066 7.56066L3.75 8.25ZM6 8.25V9.75H6.75V8.25H6Z"
        fill="currentColor"
      />
    </svg>
  );
}

function OutdatedIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-[#ffaa00]"
      aria-label="Outdated"
    >
      <title>Outdated</title>
      <circle
        cx="6"
        cy="6"
        r="4.5"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
      />
      <path
        d="M6 3V6L8 8"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Badge({ type }: { type: "fresh" | "stale" | "expired" | "outdated" }) {
  const labelClasses = {
    fresh: "bg-[#004400] text-[#88ff88]",
    stale: "bg-[#664400] text-[#ffaa00]",
    expired: "bg-[#440000] text-[#ff8888]",
    outdated: "bg-[#664400] text-[#ffaa00]",
  };

  const labels = {
    fresh: "fresh",
    stale: "stale",
    expired: "expired",
    outdated: "outdated",
  };

  return (
    <span
      className={`text-[0.7rem] px-1.5 py-0.5 rounded ${labelClasses[type]}`}
    >
      {labels[type]}
    </span>
  );
}

function BadgeWithCount({
  type,
  count,
}: {
  type: "fresh" | "stale" | "expired";
  count: number;
}) {
  const labelClasses = {
    fresh: "bg-[#004400] text-[#88ff88]",
    stale: "bg-[#664400] text-[#ffaa00]",
    expired: "bg-[#440000] text-[#ff8888]",
  };

  const labels = {
    fresh: "fresh",
    stale: "stale",
    expired: "expired",
  };

  return (
    <span
      className={`text-[0.7rem] px-1.5 py-0.5 rounded ${labelClasses[type]}`}
    >
      {labels[type]} ({count})
    </span>
  );
}

function RevalidateButton({
  tag,
  onInvalidated,
}: {
  tag: string;
  onInvalidated: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={() => {
        startTransition(async () => {
          await revalidateTagAction(tag);
          onInvalidated();
        });
      }}
    >
      <Button variant="secondary" type="submit" disabled={isPending}>
        {isPending ? "Revalidating..." : "Revalidate"}
      </Button>
    </form>
  );
}

function RefreshButton({ onRefreshed }: { onRefreshed: () => void }) {
  return (
    <Button variant="secondary" type="button" onClick={onRefreshed}>
      Refresh
    </Button>
  );
}

function UpdateButton({
  tag,
  onUpdated,
}: {
  tag: string;
  onUpdated: () => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={() => {
        startTransition(async () => {
          await updateTagAction(tag);
          await onUpdated();
        });
      }}
    >
      <Button variant="secondary" type="submit" disabled={isPending}>
        {isPending ? "Updating..." : "Update"}
      </Button>
    </form>
  );
}

function UpdateAllButton({
  tags,
  onUpdated,
}: {
  tags: string[];
  onUpdated: () => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={() => {
        startTransition(async () => {
          await Promise.all(tags.map((tag) => updateTagAction(tag)));
          await onUpdated();
        });
      }}
    >
      <Button
        variant="secondary"
        type="submit"
        disabled={isPending}
        className="px-3 py-2 font-medium"
      >
        {isPending ? "Updating..." : "Update All"}
      </Button>
    </form>
  );
}

function RevalidateAllButton({ onInvalidated }: { onInvalidated: () => void }) {
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={() => {
        startTransition(async () => {
          await revalidateTagAction(GLOBAL_CACHE_TAG);
          onInvalidated();
        });
      }}
    >
      <Button
        variant="secondary"
        type="submit"
        disabled={isPending}
        className="px-3 py-2 font-medium"
      >
        {isPending ? "Revalidating..." : "Revalidate all"}
      </Button>
    </form>
  );
}

function ClearCacheButton({ onCleared }: { onCleared: () => Promise<void> }) {
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={() => {
        startTransition(async () => {
          await clearCacheAction();
          await onCleared();
        });
      }}
    >
      <Button
        variant="secondary"
        type="submit"
        disabled={isPending}
        className="px-3 py-2 font-medium"
      >
        {isPending ? "Clearing..." : "Clear Cache"}
      </Button>
    </form>
  );
}

export function RevalidateGroupButton({
  tags,
  onInvalidated,
}: {
  tags: string[];
  onInvalidated: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={() => {
        startTransition(async () => {
          await Promise.all(tags.map((tag) => revalidateTagAction(tag)));
          onInvalidated();
        });
      }}
    >
      <Button
        variant="secondary"
        type="submit"
        disabled={isPending}
        className="text-sm"
      >
        {isPending ? "Revalidating..." : "Revalidate Group"}
      </Button>
    </form>
  );
}

export function UpdateGroupButton({
  tags,
  onUpdated,
}: {
  tags: string[];
  onUpdated: () => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={() => {
        startTransition(async () => {
          await Promise.all(tags.map((tag) => updateTagAction(tag)));
          await onUpdated();
        });
      }}
    >
      <Button
        variant="secondary"
        type="submit"
        disabled={isPending}
        className="text-sm"
      >
        {isPending ? "Updating..." : "Update Group"}
      </Button>
    </form>
  );
}

function PollMemoryCacheButton({ onLive }: { onLive: () => Promise<void> }) {
  const [isLive, setIsLive] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      startTransition(async () => {
        await onLive();
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isLive, onLive]);

  return (
    <Button
      variant="secondary"
      type="button"
      onClick={() => {
        if (!isLive) {
          startTransition(async () => {
            await onLive();
          });
        }
        setIsLive(!isLive);
      }}
      className="px-3 py-2 font-medium flex items-center gap-1.5"
    >
      <div
        className={`w-2 h-2 rounded-full ${isLive ? "bg-[#88ff88] animate-pulse" : "bg-[#440000]"}`}
      />
      Live
    </Button>
  );
}

function CacheTagsPanelImpl({ initialTags }: { initialTags: TagWithData[] }) {
  return createPortal(
    <div id="next-cache-tools">
      <CacheTagsPanelImplInner initialTags={initialTags} />
    </div>,
    document.body,
  );
}

export const CacheTagsPanel: ComponentType<{ initialTags: TagWithData[] }> =
  dynamic(() => Promise.resolve(CacheTagsPanelImpl), {
    ssr: false,
  });
