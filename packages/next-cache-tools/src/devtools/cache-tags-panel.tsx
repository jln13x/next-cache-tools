"use client";

import dynamic from "next/dynamic";
import React, {
  type ComponentType,
  useEffect,
  useState,
  useTransition,
} from "react";
import { createPortal } from "react-dom";
import { GLOBAL_CACHE_TAG, hasPrefix, stripPrefix } from "../shared";
import {
  fetchCacheTagsAction,
  revalidateTagAction,
  updateTagAction,
} from "./actions";
import type { TagData } from "./getCacheFiles";
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
  };

  const handlePollMemoryCache = async () => {
    const memoryTags = await fetchCacheTagsAction();
    setMemoryCacheTags(memoryTags);
  };

  const isTagOutdated = (t: TagWithData) => {
    return checkTagOutdated(t, memoryCacheTags);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 max-h-[50vh] z-[10000] flex flex-col overflow-hidden">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-3">
          <Logo />
        </div>
        <div className="flex gap-2 items-center">
          <PollMemoryCacheButton onPolled={handlePollMemoryCache} />
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
}: {
  selectedTag: string;
  tags: TagWithData[];
  invalidatedTags: Map<string, number>;
  onTagInvalidated: (tag: string) => void;
  onTagUpdated: (tag: string) => Promise<void>;
  currentTime: number;
  isTagOutdated: (t: TagWithData) => boolean;
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
              {invalidatedTags.has(selectedTag) && <Badge type="invalidated" />}
              {isTagOutdated({ tag: selectedTag, data: tagData.data }) && (
                <Badge type="outdated" />
              )}
            </div>
          </div>
          <RevalidateButton
            tag={selectedTag}
            onInvalidated={() => onTagInvalidated(selectedTag)}
          />
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
                {(entry.data !== undefined || entry.dataPreview) && (
                  <div className="mt-2">
                    <pre className="m-0 text-xs text-muted-foreground whitespace-pre-wrap break-words bg-muted p-2 rounded max-h-[300px] overflow-auto">
                      {entry.data !== undefined
                        ? typeof entry.data === "string"
                          ? entry.data
                          : JSON.stringify(entry.data, null, 2)
                        : entry.dataPreview}
                    </pre>
                  </div>
                )}
                {entry.tags.length > 0 && (
                  <div className="text-xs text-muted-foreground mt-2">
                    Tags: {entry.tags.join(", ")}
                  </div>
                )}
                {(entry.expire !== undefined ||
                  entry.revalidate !== undefined ||
                  entry.stale !== undefined) && (
                  <div className="flex gap-4 flex-wrap mt-2 text-xs text-muted-foreground">
                    {entry.expire !== undefined && (
                      <span>
                        <strong>Expiry:</strong> {formatDuration(entry.expire)}
                      </span>
                    )}
                    {entry.revalidate !== undefined && (
                      <span>
                        <strong>Revalidate:</strong>{" "}
                        {formatDuration(entry.revalidate)}
                      </span>
                    )}
                    {entry.stale !== undefined && (
                      <span>
                        <strong>Stale:</strong> {formatDuration(entry.stale)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
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
            {isInvalidated && <Badge type="invalidated" />}
            {isOutdated && <Badge type="outdated" />}
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

function Badge({
  type,
}: {
  type: "fresh" | "stale" | "invalidated" | "expired" | "outdated";
}) {
  const labelClasses = {
    fresh: "bg-[#004400] text-[#88ff88]",
    stale: "bg-[#664400] text-[#ffaa00]",
    invalidated: "bg-[#004466] text-[#88ccff]",
    expired: "bg-[#440000] text-[#ff8888]",
    outdated: "bg-[#664400] text-[#ffaa00]",
  };

  const labels = {
    fresh: "fresh",
    stale: "stale",
    invalidated: "invalidated",
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
      {labels[type]}
      {count > 1 ? ` (${count})` : ""}
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

function PollMemoryCacheButton({
  onPolled,
}: {
  onPolled: () => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="secondary"
      type="button"
      onClick={() => {
        startTransition(async () => {
          await onPolled();
        });
      }}
      disabled={isPending}
      className="px-3 py-2 font-medium"
    >
      {isPending ? "Polling..." : "Poll Memory Cache"}
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
