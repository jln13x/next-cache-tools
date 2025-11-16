"use client";

import dynamic from "next/dynamic";
import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { GLOBAL_CACHE_TAG, stripPrefix } from "../shared";
import { refreshAction, revalidateTagAction, updateTagAction } from "./actions";
import type { TagData } from "./getCacheFiles";

interface TagWithData {
  tag: string;
  data: TagData[];
}

interface GroupedTags {
  groupName: string;
  tags: TagWithData[];
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

function Badge({
  type,
}: {
  type: "fresh" | "stale" | "revalidated" | "expired" | "pending-revalidation";
}) {
  const styles = {
    fresh: {
      backgroundColor: "#004400",
      color: "#88ff88",
    },
    stale: {
      backgroundColor: "#664400",
      color: "#ffaa00",
    },
    revalidated: {
      backgroundColor: "#004466",
      color: "#88ccff",
    },
    expired: {
      backgroundColor: "#440000",
      color: "#ff8888",
    },
    "pending-revalidation": {
      backgroundColor: "#664400",
      color: "#ffcc00",
    },
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
      style={{
        fontSize: "0.7rem",
        padding: "0.1rem 0.4rem",
        borderRadius: "3px",
        ...styles[type],
      }}
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
      <button
        type="submit"
        disabled={isPending}
        style={{
          padding: "0.3rem 0.6rem",
          backgroundColor: "#2a2a2a",
          color: "#fff",
          border: "1px solid #444",
          borderRadius: "4px",
          cursor: isPending ? "not-allowed" : "pointer",
          opacity: isPending ? 0.5 : 1,
        }}
      >
        {isPending ? "Revalidating..." : "Revalidate"}
      </button>
    </form>
  );
}

function UpdateButton({ tag }: { tag: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={() => {
        startTransition(async () => {
          await updateTagAction(tag);
        });
      }}
    >
      <button
        type="submit"
        disabled={isPending}
        style={{
          padding: "0.3rem 0.6rem",
          backgroundColor: "#2a2a2a",
          color: "#fff",
          border: "1px solid #444",
          borderRadius: "4px",
          cursor: isPending ? "not-allowed" : "pointer",
          opacity: isPending ? 0.5 : 1,
        }}
      >
        {isPending ? "Updating..." : "Update"}
      </button>
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
      <button
        type="submit"
        disabled={isPending}
        style={{
          padding: "0.4rem 0.8rem",
          backgroundColor: "#2a2a2a",
          color: "#fff",
          border: "1px solid #444",
          borderRadius: "4px",
          cursor: isPending ? "not-allowed" : "pointer",
          opacity: isPending ? 0.5 : 1,
          fontWeight: "500",
        }}
      >
        {isPending ? "Refreshing..." : "Refresh Client"}
      </button>
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
      <button
        type="submit"
        disabled={isPending}
        style={{
          padding: "0.4rem 0.8rem",
          backgroundColor: "#2a2a2a",
          color: "#fff",
          border: "1px solid #444",
          borderRadius: "4px",
          cursor: isPending ? "not-allowed" : "pointer",
          opacity: isPending ? 0.5 : 1,
          fontWeight: "500",
        }}
      >
        {isPending ? "Revalidating..." : "Revalidate all"}
      </button>
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
      <button
        type="submit"
        disabled={isPending}
        style={{
          padding: "0.3rem 0.6rem",
          backgroundColor: "#2a2a2a",
          color: "#fff",
          border: "1px solid #444",
          borderRadius: "4px",
          cursor: isPending ? "not-allowed" : "pointer",
          opacity: isPending ? 0.5 : 1,
          fontSize: "0.85rem",
        }}
      >
        {isPending ? "Revalidating..." : "Revalidate Group"}
      </button>
    </form>
  );
}

function UpdateGroupButton({ tags }: { tags: string[] }) {
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={() => {
        startTransition(async () => {
          await Promise.all(tags.map((tag) => updateTagAction(tag)));
        });
      }}
    >
      <button
        type="submit"
        disabled={isPending}
        style={{
          padding: "0.3rem 0.6rem",
          backgroundColor: "#2a2a2a",
          color: "#fff",
          border: "1px solid #444",
          borderRadius: "4px",
          cursor: isPending ? "not-allowed" : "pointer",
          opacity: isPending ? 0.5 : 1,
          fontSize: "0.85rem",
        }}
      >
        {isPending ? "Updating..." : "Update Group"}
      </button>
    </form>
  );
}

function CacheTagsPanel({ initialTags }: { initialTags: TagWithData[] }) {
  const [tags, setTags] = useState<TagWithData[]>(initialTags);
  const [isExpanded, setIsExpanded] = useState(true);
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

  const isTagExpired = (tag: string): boolean => {
    const tagData = tags.find((t) => t.tag === tag);
    if (!tagData) return false;

    const now = Date.now();
    return tagData.data.some((entry) => {
      if (entry.expire === undefined) return false;
      const expireTime = entry.timestamp + entry.expire * 1000;
      return expireTime < now;
    });
  };

  const isTagStale = (tag: string): boolean => {
    const tagData = tags.find((t) => t.tag === tag);
    if (!tagData) return false;

    const now = Date.now();
    return tagData.data.some((entry) => {
      if (entry.stale === undefined) return false;
      const staleTime = entry.timestamp + entry.stale * 1000;
      return staleTime < now;
    });
  };

  if (!isExpanded) {
    return createPortal(
      <button
        type="button"
        onClick={() => setIsExpanded(true)}
        style={{
          position: "fixed",
          bottom: "1rem",
          right: "1rem",
          padding: "0.75rem 1rem",
          backgroundColor: "#2a2a2a",
          color: "#fff",
          border: "1px solid #444",
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "0.9rem",
          fontWeight: "500",
          zIndex: 10000,
        }}
      >
        Cache Tags
      </button>,
      document.body,
    );
  }

  const panelContent = (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "#1a1a1a",
        borderTop: "1px solid #333",
        padding: "1rem",
        maxHeight: "50vh",
        zIndex: 10000,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.5rem",
        }}
      >
        <h2 style={{ margin: 0, color: "#fff" }}>Cache Tags</h2>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <RevalidateAllButton onRevalidated={handleRevalidateAll} />
          <RefreshButton />
          <button
            type="button"
            onClick={() => setIsExpanded(false)}
            style={{
              padding: "0.4rem 0.8rem",
              backgroundColor: "#2a2a2a",
              color: "#fff",
              border: "1px solid #444",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "500",
            }}
          >
            Close
          </button>
        </div>
      </div>
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          display: "flex",
          gap: "1rem",
        }}
      >
        <div
          style={{
            flex: 1,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <input
            type="text"
            placeholder="Search tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "0.5rem",
              marginBottom: "1rem",
              border: "1px solid #444",
              borderRadius: "4px",
              backgroundColor: "#2a2a2a",
              color: "#fff",
              outline: "none",
            }}
          />
          <div
            style={{
              flex: 1,
              overflow: "auto",
            }}
          >
            {standaloneTags.length > 0 || groupedTagsArray.length > 0 ? (
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {standaloneTags
                  .sort((a, b) => a.tag.localeCompare(b.tag))
                  .map(({ tag }) => (
                    <li
                      key={tag}
                      style={{
                        padding: 0,
                        borderBottom: "1px solid #333",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedTag(tag)}
                        style={{
                          width: "100%",
                          padding: "0.5rem",
                          backgroundColor: "transparent",
                          border:
                            selectedTag === tag ? "2px solid #4a9eff" : "none",
                          borderRadius: "3px",
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            flexWrap: "wrap",
                          }}
                        >
                          <code
                            style={{
                              backgroundColor: "#2a2a2a",
                              padding: "0.2rem 0.4rem",
                              borderRadius: "3px",
                              color: "#fff",
                              flex: 1,
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                            }}
                          >
                            {formatTagForDisplay(tag)}
                            {isTagExpired(tag) && <Badge type="expired" />}
                            {isTagStale(tag) && !isTagExpired(tag) && (
                              <Badge type="stale" />
                            )}
                            {!isTagStale(tag) && !isTagExpired(tag) && (
                              <Badge type="fresh" />
                            )}
                            {pendingRevalidations.has(tag) && (
                              <Badge type="pending-revalidation" />
                            )}
                            {revalidatedTags.has(tag) &&
                              !pendingRevalidations.has(tag) && (
                                <Badge type="revalidated" />
                              )}
                          </code>
                        </div>
                      </button>
                    </li>
                  ))}
                {groupedTagsArray.map(({ groupName, tags }) => (
                  <li
                    key={groupName}
                    style={{
                      padding: 0,
                      borderBottom: "1px solid #333",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleGroupExpand(groupName)}
                      style={{
                        width: "100%",
                        padding: "0.5rem",
                        backgroundColor: "transparent",
                        border: "none",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          marginBottom: expandedGroups.has(groupName)
                            ? "0.5rem"
                            : 0,
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            color: "#fff",
                            fontWeight: "600",
                            fontSize: "0.9rem",
                          }}
                        >
                          {expandedGroups.has(groupName) ? "▼" : "▶"}
                        </span>
                        <span
                          style={{
                            color: "#fff",
                            fontWeight: "600",
                            fontSize: "1rem",
                            flex: 1,
                          }}
                        >
                          {groupName} ({tags.length})
                        </span>
                      </div>
                    </button>
                    {expandedGroups.has(groupName) && (
                      <>
                        <div
                          style={{
                            padding: "0.5rem",
                            paddingLeft: "1.5rem",
                            display: "flex",
                            gap: "0.5rem",
                            borderBottom: "1px solid #333",
                          }}
                        >
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
                          />
                        </div>
                        <ul
                          style={{
                            listStyle: "none",
                            padding: 0,
                            margin: 0,
                            marginLeft: "1.5rem",
                          }}
                        >
                          {tags.map(({ tag }) => (
                            <li
                              key={tag}
                              style={{
                                padding: 0,
                                borderBottom: "1px solid #333",
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => setSelectedTag(tag)}
                                style={{
                                  width: "100%",
                                  padding: "0.5rem",
                                  backgroundColor: "transparent",
                                  border:
                                    selectedTag === tag
                                      ? "2px solid #4a9eff"
                                      : "none",
                                  borderRadius: "3px",
                                  cursor: "pointer",
                                  textAlign: "left",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <code
                                    style={{
                                      backgroundColor: "#2a2a2a",
                                      padding: "0.2rem 0.4rem",
                                      borderRadius: "3px",
                                      color: "#fff",
                                      flex: 1,
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "0.5rem",
                                    }}
                                  >
                                    {formatTagForDisplay(tag)}
                                    {isTagExpired(tag) && (
                                      <Badge type="expired" />
                                    )}
                                    {isTagStale(tag) && !isTagExpired(tag) && (
                                      <Badge type="stale" />
                                    )}
                                    {!isTagStale(tag) && !isTagExpired(tag) && (
                                      <Badge type="fresh" />
                                    )}
                                    {pendingRevalidations.has(tag) && (
                                      <Badge type="pending-revalidation" />
                                    )}
                                    {revalidatedTags.has(tag) &&
                                      !pendingRevalidations.has(tag) && (
                                        <Badge type="revalidated" />
                                      )}
                                  </code>
                                </div>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div style={{ color: "#888" }}>No tags found</div>
            )}
          </div>
        </div>
        {selectedTag && (
          <div
            style={{
              flex: 1,
              overflow: "auto",
              backgroundColor: "#2a2a2a",
              borderRadius: "4px",
              padding: "1rem",
            }}
          >
            {(() => {
              const tagData = tags.find((t) => t.tag === selectedTag);
              if (!tagData || tagData.data.length === 0) {
                return (
                  <div style={{ color: "#888" }}>No data for this tag</div>
                );
              }
              const colonIndex = selectedTag.indexOf(":");
              const groupName =
                colonIndex !== -1
                  ? stripPrefix(selectedTag.substring(0, colonIndex))
                  : null;

              return (
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      marginBottom: "1rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      {groupName && (
                        <div
                          style={{
                            fontSize: "0.75rem",
                            color: "#888",
                            opacity: 0.6,
                            marginBottom: "0.25rem",
                          }}
                        >
                          {groupName}
                        </div>
                      )}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          flexWrap: "wrap",
                        }}
                      >
                        <h3
                          style={{
                            color: "#fff",
                            margin: 0,
                            fontSize: "1.5rem",
                            fontWeight: "700",
                          }}
                        >
                          {formatTagForDisplay(selectedTag)}
                        </h3>
                        {isTagExpired(selectedTag) && <Badge type="expired" />}
                        {isTagStale(selectedTag) &&
                          !isTagExpired(selectedTag) && <Badge type="stale" />}
                        {!isTagStale(selectedTag) &&
                          !isTagExpired(selectedTag) && <Badge type="fresh" />}
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
                    <UpdateButton tag={selectedTag} />
                  </div>
                  <div
                    style={{
                      marginTop: "1.5rem",
                      marginBottom: "1rem",
                      paddingBottom: "0.5rem",
                      borderBottom: "1px solid #444",
                    }}
                  >
                    <h4
                      style={{
                        color: "#fff",
                        margin: 0,
                        fontSize: "1rem",
                        fontWeight: "600",
                      }}
                    >
                      Cache Entries ({tagData.data.length})
                    </h4>
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "#888",
                        marginTop: "0.25rem",
                      }}
                    >
                      These are the cached data entries attached to this tag
                    </div>
                  </div>
                  {tagData.data.map((entry, idx) => (
                    <div
                      key={`${entry.key}-${entry.timestamp}-${idx}`}
                      style={{
                        marginBottom:
                          idx < tagData.data.length - 1 ? "1.5rem" : 0,
                        paddingBottom:
                          idx < tagData.data.length - 1 ? "1.5rem" : 0,
                        borderBottom:
                          idx < tagData.data.length - 1
                            ? "1px solid #333"
                            : "none",
                        backgroundColor: "#1a1a1a",
                        padding: "1rem",
                        borderRadius: "4px",
                      }}
                    >
                      <div style={{ fontSize: "0.85rem", color: "#888" }}>
                        <div
                          style={{
                            display: "flex",
                            gap: "1rem",
                            flexWrap: "wrap",
                            marginBottom: "0.5rem",
                          }}
                        >
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
                          <div style={{ marginTop: "0.5rem" }}>
                            <div
                              style={{
                                fontSize: "0.8rem",
                                color: "#888",
                                marginBottom: "0.25rem",
                              }}
                            >
                              <strong>Preview:</strong>
                            </div>
                            <pre
                              style={{
                                margin: 0,
                                fontSize: "0.75rem",
                                color: "#fff",
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                                backgroundColor: "#1a1a1a",
                                padding: "0.5rem",
                                borderRadius: "4px",
                                maxHeight: "300px",
                                overflow: "auto",
                              }}
                            >
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
                  ))}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(panelContent, document.body);
}

export const OpenDevtools = dynamic(() => Promise.resolve(CacheTagsPanel), {
  ssr: false,
});
