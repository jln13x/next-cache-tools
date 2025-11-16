"use client";

import dynamic from "next/dynamic";
import React, { type ComponentType, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { GLOBAL_CACHE_TAG, stripPrefix } from "../shared";
import {
  fetchCacheTagsAction,
  refreshAction,
  revalidateTagAction,
  updateTagAction,
} from "./actions";
import type { TagData } from "./getCacheFiles";
import "./index.css";

interface TagWithData {
  tag: string;
  data: TagData[];
}

interface GroupedTags {
  groupName: string;
  tags: TagWithData[];
}

function OpenButton({ onExpand }: { onExpand: () => void }) {
  return (
    <button
      type="button"
      onClick={onExpand}
      className="fixed bottom-4 right-4 px-4 py-3 bg-primary text-primary-foreground border border-primary rounded-lg cursor-pointer text-sm font-medium z-[10000]"
    >
      Next Cache Tools
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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [revalidatedTags, setRevalidatedTags] = useState<Map<string, number>>(
    new Map(),
  );
  const [pendingRevalidations, setPendingRevalidations] = useState<Set<string>>(
    new Set(),
  );
  const [tagsWithData, setTagsWithData] = useState<Set<string>>(
    new Set(initialTags.filter((t) => t.data.length > 0).map((t) => t.tag)),
  );

  const filteredTags = tags.filter(
    ({ tag, data }) =>
      tag !== GLOBAL_CACHE_TAG &&
      (data.length > 0 || tagsWithData.has(tag)) &&
      tag.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const standaloneTags = filteredTags.filter(({ tag }) => !tag.includes(":"));

  const groupedTags = filteredTags
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

  const groupedTagsArray: GroupedTags[] = Array.from(groupedTags.entries())
    .map(([groupName, tags]) => ({
      groupName,
      tags: tags.sort((a, b) => a.tag.localeCompare(b.tag)),
    }))
    .sort((a, b) => a.groupName.localeCompare(b.groupName));

  const toggleGroupExpand = (groupName: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupName)) {
      newExpanded.delete(groupName);
    } else {
      newExpanded.add(groupName);
    }
    setExpandedGroups(newExpanded);
  };

  const handleTagRevalidated = (tag: string) => {
    const now = Date.now();
    setRevalidatedTags((prev) => {
      const newMap = new Map(prev);
      newMap.set(tag, now);
      return newMap;
    });
  };

  const handleRevalidateAll = () => {
    const now = Date.now();
    setRevalidatedTags((prev) => {
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
      if (updatedTagData.data.length > 0) {
        setTagsWithData((prev) => new Set(prev).add(tag));
      }
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
          if (updatedTagData.data.length > 0) {
            setTagsWithData((prev) => new Set(prev).add(tag));
          }
        }
      });
      return newTags;
    });
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 max-h-[50vh] z-[10000] flex flex-col overflow-hidden">
      <div className="flex justify-between items-center mb-2">
        <h2 className="m-0 text-white">Cache Tags</h2>
        <div className="flex gap-2 items-center">
          <RevalidateAllButton onRevalidated={handleRevalidateAll} />
          <RefreshButton />
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
            {standaloneTags.length > 0 || groupedTagsArray.length > 0 ? (
              <ul className="list-none p-0 m-0">
                {standaloneTags
                  .sort((a, b) => a.tag.localeCompare(b.tag))
                  .map(({ tag, data }) => (
                    <li key={tag} className="p-0 border-b border-border">
                      <Tag
                        tag={tag}
                        data={data}
                        isPendingRevalidation={pendingRevalidations.has(tag)}
                        isRevalidated={revalidatedTags.has(tag)}
                        isSelected={selectedTag === tag}
                        onClick={() => setSelectedTag(tag)}
                      />
                    </li>
                  ))}
                {groupedTagsArray.map(({ groupName, tags }) => (
                  <li key={groupName} className="p-0 border-b border-border">
                    <button
                      type="button"
                      onClick={() => toggleGroupExpand(groupName)}
                      className="w-full p-2 bg-transparent border-none cursor-pointer text-left"
                    >
                      <div
                        className={`flex items-center gap-2 flex-wrap ${expandedGroups.has(groupName) ? "mb-2" : "mb-0"}`}
                      >
                        <span className="text-white font-semibold text-sm">
                          {expandedGroups.has(groupName) ? "▼" : "▶"}
                        </span>
                        <span className="text-white font-semibold text-base flex-1">
                          {groupName} ({tags.length})
                        </span>
                      </div>
                    </button>
                    {expandedGroups.has(groupName) && (
                      <>
                        <div className="p-2 pl-6 flex gap-2 border-b border-border">
                          <RevalidateGroupButton
                            tags={tags.map(({ tag }) => tag)}
                            onRevalidated={() => {
                              tags.forEach(({ tag }) => {
                                handleTagRevalidated(tag);
                              });
                            }}
                          />
                          <UpdateGroupButton
                            tags={tags.map(({ tag }) => tag)}
                            onUpdated={() =>
                              handleGroupUpdated(tags.map(({ tag }) => tag))
                            }
                          />
                        </div>
                        <ul className="list-none p-0 m-0 ml-6">
                          {tags.map(({ tag, data }) => (
                            <li
                              key={tag}
                              className="p-0 border-b border-border"
                            >
                              <Tag
                                tag={tag}
                                data={data}
                                isPendingRevalidation={pendingRevalidations.has(
                                  tag,
                                )}
                                isRevalidated={revalidatedTags.has(tag)}
                                isSelected={selectedTag === tag}
                                onClick={() => setSelectedTag(tag)}
                              />
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-muted-foreground">No tags found</div>
            )}
          </div>
        </div>
        {selectedTag && (
          <div className="flex-1 overflow-auto bg-muted rounded p-4">
            {(() => {
              const tagData = tags.find((t) => t.tag === selectedTag);
              if (!tagData || tagData.data.length === 0) {
                return (
                  <div className="text-muted-foreground">
                    No data for this tag
                  </div>
                );
              }
              const colonIndex = selectedTag.indexOf(":");
              const groupName =
                colonIndex !== -1
                  ? stripPrefix(selectedTag.substring(0, colonIndex))
                  : null;

              return (
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
                        {pendingRevalidations.has(selectedTag) && (
                          <Badge type="pending-revalidation" />
                        )}
                        {revalidatedTags.has(selectedTag) &&
                          !pendingRevalidations.has(selectedTag) && (
                            <Badge type="revalidated" />
                          )}
                      </div>
                    </div>
                    <RevalidateButton
                      tag={selectedTag}
                      onRevalidated={() => handleTagRevalidated(selectedTag)}
                    />
                    <UpdateButton
                      tag={selectedTag}
                      onUpdated={() => handleTagUpdated(selectedTag)}
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
                    const badgeType = getEntryBadgeType(entry);
                    return (
                      <div
                        key={`${entry.key}-${entry.timestamp}-${idx}`}
                        className={`${idx < tagData.data.length - 1 ? "mb-6 pb-6 border-b border-border" : ""} bg-background p-4 rounded`}
                      >
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {badgeType && <Badge type={badgeType} />}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <div className="flex gap-4 flex-wrap mb-2">
                            <span>
                              <strong>Cached at:</strong>{" "}
                              {formatTimestamp(entry.timestamp)}
                            </span>
                            {entry.expire !== undefined && (
                              <span>
                                <strong>Expiry:</strong>{" "}
                                {formatDuration(entry.expire)}
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
                                <strong>Stale:</strong>{" "}
                                {formatDuration(entry.stale)}
                              </span>
                            )}
                          </div>
                          {(entry.data !== undefined || entry.dataPreview) && (
                            <div className="mt-2">
                              <div className="text-xs text-muted-foreground mb-1">
                                <strong>Preview:</strong>
                              </div>
                              <pre className="m-0 text-xs text-muted-foreground whitespace-pre-wrap break-words bg-muted p-2 rounded max-h-[300px] overflow-auto">
                                {entry.data !== undefined
                                  ? typeof entry.data === "string"
                                    ? entry.data
                                    : JSON.stringify(entry.data, null, 2)
                                  : entry.dataPreview}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}

function Tag({
  tag,
  data,
  isPendingRevalidation,
  isRevalidated,
  isSelected,
  onClick,
}: {
  tag: string;
  data: TagData[];
  isPendingRevalidation: boolean;
  isRevalidated: boolean;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full p-2 bg-transparent rounded cursor-pointer text-left ${isSelected ? "border-2 border-[#4a9eff]" : "border-none"}`}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <code className="bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded flex-1 flex items-center gap-2 justify-between">
          {formatTagForDisplay(tag)}
          {isPendingRevalidation && <Badge type="pending-revalidation" />}
          {isRevalidated && !isPendingRevalidation && (
            <Badge type="revalidated" />
          )}
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

function formatDuration(value: number): string {
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

function formatTagForDisplay(tag: string): string {
  const colonIndex = tag.indexOf(":");
  if (colonIndex === -1) return tag;
  return tag.substring(colonIndex + 1);
}

function formatTimestamp(timestamp: number): string {
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
    default: "bg-[#2a2a2a] text-white border border-[#444]",
    secondary: "bg-secondary text-secondary-foreground border border-border",
  };

  return (
    <button
      className={`px-2.5 py-1.5 rounded cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function Badge({
  type,
}: {
  type: "fresh" | "stale" | "revalidated" | "expired" | "pending-revalidation";
}) {
  const labelClasses = {
    fresh: "bg-[#004400] text-[#88ff88]",
    stale: "bg-[#664400] text-[#ffaa00]",
    revalidated: "bg-[#004466] text-[#88ccff]",
    expired: "bg-[#440000] text-[#ff8888]",
    "pending-revalidation": "bg-[#664400] text-[#ffcc00]",
  };

  const labels = {
    fresh: "fresh",
    stale: "stale",
    revalidated: "revalidated",
    expired: "expired",
    "pending-revalidation": "pending",
  };

  return (
    <span
      className={`text-[0.7rem] px-1.5 py-0.5 rounded ${labelClasses[type]}`}
    >
      {labels[type]}
    </span>
  );
}

function RevalidateButton({
  tag,
  onRevalidated,
}: {
  tag: string;
  onRevalidated: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={() => {
        startTransition(async () => {
          await revalidateTagAction(tag);
          onRevalidated();
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

function RefreshButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={() => {
        startTransition(async () => {
          await refreshAction();
        });
      }}
    >
      <Button
        variant="secondary"
        type="submit"
        disabled={isPending}
        className="px-3 py-2 font-medium"
      >
        {isPending ? "Refreshing..." : "Refresh Client"}
      </Button>
    </form>
  );
}

function RevalidateAllButton({ onRevalidated }: { onRevalidated: () => void }) {
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={() => {
        startTransition(async () => {
          await revalidateTagAction(GLOBAL_CACHE_TAG);
          onRevalidated();
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

function RevalidateGroupButton({
  tags,
  onRevalidated,
}: {
  tags: string[];
  onRevalidated: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={() => {
        startTransition(async () => {
          await Promise.all(tags.map((tag) => revalidateTagAction(tag)));
          onRevalidated();
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

function UpdateGroupButton({
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

function getEntryBadgeType(
  entry: TagData,
): "fresh" | "stale" | "expired" | null {
  const now = Date.now();

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
