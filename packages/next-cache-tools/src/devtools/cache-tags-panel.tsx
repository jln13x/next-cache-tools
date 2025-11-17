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

function Logo() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="83"
      height="42"
      fill="none"
      viewBox="0 0 83 42"
      className="h-6 w-auto"
      aria-label="Next Cache Tools"
    >
      <title>Next Cache Tools</title>
      <g filter="url(#a)">
        <mask
          id="c"
          width="83"
          height="42"
          x="-.353"
          y="-.257"
          fill="#000"
          maskUnits="userSpaceOnUse"
        >
          <path fill="#fff" d="M-.353-.257h83v42h-83z" />
          <path d="M27.136 39.743h-5.082V18.691H6.81v21.052H1.728V14.336H6.81v3.63l3.63-3.63h11.614q2.106 0 3.557 1.524 1.525 1.452 1.525 3.557zm31.958-25.407-4.428 4.355H42.397v16.697h15.245v4.355H42.397q-2.105 0-3.63-1.452-1.45-1.524-1.451-3.63V19.418q0-2.105 1.452-3.557 1.524-1.524 3.63-1.524zM80.88 39.743H70.717q-2.105 0-3.63-1.452-1.452-1.524-1.452-3.63v-15.97h-7.259l4.356-4.355h2.903V9.254l5.082-5.081v10.163H80.88v4.355H70.717v16.697H80.88z" />
        </mask>
        <path
          fill="url(#b)"
          d="M27.136 39.743h-5.082V18.691H6.81v21.052H1.728V14.336H6.81v3.63l3.63-3.63h11.614q2.106 0 3.557 1.524 1.525 1.452 1.525 3.557zm31.958-25.407-4.428 4.355H42.397v16.697h15.245v4.355H42.397q-2.105 0-3.63-1.452-1.45-1.524-1.451-3.63V19.418q0-2.105 1.452-3.557 1.524-1.524 3.63-1.524zM80.88 39.743H70.717q-2.105 0-3.63-1.452-1.452-1.524-1.452-3.63v-15.97h-7.259l4.356-4.355h2.903V9.254l5.082-5.081v10.163H80.88v4.355H70.717v16.697H80.88z"
          shapeRendering="crispEdges"
        />
        <path
          fill="#f80"
          fillOpacity=".29"
          d="M27.136 39.743v1.729h1.728v-1.729zm-5.082 0h-1.728v1.729h1.728zm0-21.052h1.729v-1.728h-1.729zm-15.244 0v-1.728H5.082v1.728zm0 21.052v1.729h1.728v-1.729zm-5.082 0H0v1.729h1.728zm0-25.407v-1.729H0v1.729zm5.082 0h1.728v-1.729H6.81zm0 3.63H5.082v4.172l2.95-2.95zm3.63-3.63v-1.729h-.716l-.507.507zM25.61 15.86l-1.251 1.192.029.03.03.03zm1.525 23.883v-1.728h-5.082v3.457h5.082zm-5.082 0h1.729V18.691h-3.457v21.052zm0-21.052v-1.728H6.81v3.457h15.244zm-15.244 0H5.082v21.052h3.456V18.691zm0 21.052v-1.728H1.728v3.457H6.81zm-5.082 0h1.729V14.336H0v25.407zm0-25.407v1.728H6.81v-3.457H1.728zm5.082 0H5.082v3.63h3.456v-3.63zm0 3.63 1.222 1.221 3.63-3.63-1.222-1.221-1.223-1.222-3.63 3.63zm3.63-3.63v1.728h11.614v-3.457H10.44zm11.614 0v1.728c.93 0 1.664.314 2.306.988l1.251-1.192 1.252-1.192c-1.294-1.359-2.932-2.06-4.809-2.06zm3.557 1.524-1.192 1.252c.674.642.988 1.375.988 2.305h3.457c0-1.876-.702-3.514-2.06-4.808zm1.525 3.557h-1.729v20.326h3.457V19.417zm31.958-5.081 1.212 1.232 3.01-2.96h-4.222zm-4.428 4.355v1.729h.707l.505-.497zm-12.269 0v-1.728H40.67v1.728zm0 16.697H40.67v1.728h1.728zm15.245 0h1.728v-1.729h-1.728zm0 4.355v1.729h1.728v-1.729zm-18.874-1.452-1.252 1.192.03.03.03.03zm0-22.43-1.223-1.223zm20.326-1.525-1.212-1.232-4.428 4.355 1.212 1.232 1.212 1.233 4.428-4.356zm-4.428 4.355v-1.728H42.397v3.457h12.269zm-12.269 0H40.67v16.697h3.457V18.69zm0 16.697v1.728h15.245v-3.457H42.397zm15.245 0h-1.729v4.355h3.457v-4.355zm0 4.355v-1.728H42.397v3.457h15.245zm-15.245 0v-1.728c-.96 0-1.742-.313-2.437-.975l-1.192 1.251-1.192 1.252c1.337 1.274 2.974 1.929 4.821 1.929zm-3.63-1.452L40.02 37.1c-.661-.695-.975-1.478-.975-2.437h-3.457c0 1.847.655 3.484 1.93 4.821zm-1.451-3.63h1.728V19.418h-3.457v15.245zm0-15.244h1.728c0-.958.311-1.7.946-2.335l-1.222-1.222-1.223-1.222c-1.3 1.301-1.958 2.93-1.958 4.78zm1.452-3.557 1.222 1.222c.7-.7 1.474-1.018 2.407-1.018v-3.457c-1.874 0-3.52.7-4.852 2.031zm3.63-1.524v1.728h16.696v-3.457H42.397zM80.88 39.743v1.729h1.728v-1.729zm-13.793-1.452-1.251 1.192.029.03.03.03zm-1.452-19.6h1.729v-1.728h-1.729zm-7.259 0-1.222-1.222-2.95 2.95h4.172zm4.356-4.355v-1.729h-.716l-.506.507zm2.903 0v1.728h1.729v-1.728zm0-5.082-1.222-1.222-.506.506v.716zm5.082-5.081h1.728V0l-2.95 2.95zm0 10.163h-1.728v1.728h1.728zm10.163 0h1.728v-1.729H80.88zm0 4.355v1.729h1.728V18.69zm-10.163 0v-1.728h-1.728v1.728zm0 16.697h-1.728v1.728h1.728zm10.163 0h1.728v-1.729H80.88zm0 4.355v-1.728H70.717v3.457H80.88zm-10.163 0v-1.728c-.96 0-1.743-.313-2.438-.975l-1.192 1.251-1.192 1.252c1.338 1.274 2.975 1.929 4.822 1.929zm-3.63-1.452L68.34 37.1c-.662-.695-.975-1.478-.975-2.437h-3.457c0 1.847.655 3.484 1.929 4.821zm-1.452-3.63h1.729v-15.97h-3.457v15.97zm0-15.97v-1.728h-7.259v3.457h7.26zm-7.259 0 1.222 1.223 4.356-4.356-1.222-1.222-1.222-1.222-4.356 4.355zm4.356-4.355v1.728h2.903v-3.457h-2.903zm2.903 0h1.729V9.254h-3.457v5.082zm0-5.082 1.223 1.222 5.081-5.081-1.222-1.222-1.222-1.222-5.082 5.081zm5.082-5.081h-1.728v10.163h3.456V4.173zm0 10.163v1.728H80.88v-3.457H70.717zm10.163 0h-1.728v4.355h3.456v-4.355zm0 4.355v-1.728H70.717v3.457H80.88zm-10.163 0h-1.728v16.697h3.456V18.69zm0 16.697v1.728H80.88v-3.457H70.717zm10.163 0h-1.728v4.355h3.456v-4.355z"
          mask="url(#c)"
        />
      </g>
      <defs>
        <linearGradient
          id="b"
          x1="40.147"
          x2="40.147"
          y1="-14.257"
          y2="55.743"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#f80" />
          <stop offset="1" stopColor="#ba7000" />
        </linearGradient>
        <filter
          id="a"
          width="82.608"
          height="41.472"
          x="0"
          y="0"
          colorInterpolationFilters="sRGB"
          filterUnits="userSpaceOnUse"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            result="hardAlpha"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
          />
          <feOffset />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
          <feBlend in2="BackgroundImageFix" result="effect1_dropShadow_22_3" />
          <feBlend
            in="SourceGraphic"
            in2="effect1_dropShadow_22_3"
            result="shape"
          />
        </filter>
      </defs>
    </svg>
  );
}

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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
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

  const processTags = (tagList: TagWithData[]) => {
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
  };

  const nctProcessed = processTags(nctTags);
  const externalProcessed = processTags(externalTags);

  const toggleGroupExpand = (groupName: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupName)) {
      newExpanded.delete(groupName);
    } else {
      newExpanded.add(groupName);
    }
    setExpandedGroups(newExpanded);
  };

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

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 max-h-[50vh] z-[10000] flex flex-col overflow-hidden">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-3">
          <Logo />
        </div>
        <div className="flex gap-2 items-center">
          <RevalidateAllButton onInvalidated={handleInvalidateAll} />
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
            {nctProcessed.standalone.length > 0 ||
            nctProcessed.groupedArray.length > 0 ||
            externalProcessed.standalone.length > 0 ||
            externalProcessed.groupedArray.length > 0 ? (
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
                          />
                        </li>
                      ))}
                    {nctProcessed.groupedArray.map(({ groupName, tags }) => (
                      <li
                        key={groupName}
                        className="p-0 border-b border-border"
                      >
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
                                onInvalidated={() => {
                                  tags.forEach(({ tag }) => {
                                    handleTagInvalidated(tag);
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
                                    isInvalidated={invalidatedTags.has(tag)}
                                    isSelected={selectedTag === tag}
                                    onClick={() => setSelectedTag(tag)}
                                    currentTime={currentTime}
                                  />
                                </li>
                              ))}
                            </ul>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {(externalProcessed.standalone.length > 0 ||
                  externalProcessed.groupedArray.length > 0) && (
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
                              onClick={() => setSelectedTag(tag)}
                              currentTime={currentTime}
                            />
                          </li>
                        ))}
                      {externalProcessed.groupedArray.map(
                        ({ groupName, tags }) => (
                          <li
                            key={groupName}
                            className="p-0 border-b border-border"
                          >
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
                                    onInvalidated={() => {
                                      tags.forEach(({ tag }) => {
                                        handleTagInvalidated(tag);
                                      });
                                    }}
                                  />
                                  <UpdateGroupButton
                                    tags={tags.map(({ tag }) => tag)}
                                    onUpdated={() =>
                                      handleGroupUpdated(
                                        tags.map(({ tag }) => tag),
                                      )
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
                                        isInvalidated={invalidatedTags.has(tag)}
                                        isSelected={selectedTag === tag}
                                        onClick={() => setSelectedTag(tag)}
                                        currentTime={currentTime}
                                      />
                                    </li>
                                  ))}
                                </ul>
                              </>
                            )}
                          </li>
                        ),
                      )}
                    </ul>
                  </div>
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
          />
        )}
      </div>
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
}: {
  selectedTag: string;
  tags: TagWithData[];
  invalidatedTags: Map<string, number>;
  onTagInvalidated: (tag: string) => void;
  onTagUpdated: (tag: string) => Promise<void>;
  currentTime: number;
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

function Tag({
  tag,
  data,
  isInvalidated,
  isSelected,
  onClick,
  currentTime,
}: {
  tag: string;
  data: TagData[];
  isInvalidated: boolean;
  isSelected: boolean;
  onClick: () => void;
  currentTime: number;
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
  type: "fresh" | "stale" | "invalidated" | "expired";
}) {
  const labelClasses = {
    fresh: "bg-[#004400] text-[#88ff88]",
    stale: "bg-[#664400] text-[#ffaa00]",
    invalidated: "bg-[#004466] text-[#88ccff]",
    expired: "bg-[#440000] text-[#ff8888]",
  };

  const labels = {
    fresh: "fresh",
    stale: "stale",
    invalidated: "invalidated",
    expired: "expired",
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

function RevalidateGroupButton({
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

function getEntryCounts(
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
