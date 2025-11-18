import { useState } from "react";
import {
  RevalidateGroupButton,
  Tag,
  UpdateGroupButton,
} from "./cache-tags-panel";
import type { TagWithData } from "./utils";

interface TagGroupProps {
  groupName: string;
  tags: TagWithData[];
  selectedTag: string | null;
  invalidatedTags: Map<string, number>;
  currentTime: number;
  onTagSelect: (tag: string) => void;
  onTagInvalidated: (tag: string) => void;
  onGroupUpdated: (tags: string[]) => Promise<void>;
  isTagOutdated: (t: TagWithData) => boolean;
}

export function TagGroup({
  groupName,
  tags,
  selectedTag,
  invalidatedTags,
  currentTime,
  onTagSelect,
  onTagInvalidated,
  onGroupUpdated,
  isTagOutdated,
}: TagGroupProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <li key={groupName} className="p-0 border-b border-border">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-2 bg-transparent border-none cursor-pointer text-left"
      >
        <div
          className={`flex items-center gap-2 flex-wrap ${isExpanded ? "mb-2" : "mb-0"}`}
        >
          <span className="text-white font-semibold text-sm">
            {isExpanded ? "▼" : "▶"}
          </span>
          <span className="text-white font-semibold text-base flex-1">
            {groupName} ({tags.length})
          </span>
        </div>
      </button>
      {isExpanded && (
        <>
          <div className="p-2 pl-6 flex gap-2 border-b border-border">
            <RevalidateGroupButton
              tags={tags.map(({ tag }) => tag)}
              onInvalidated={() => {
                tags.forEach(({ tag }) => {
                  onTagInvalidated(tag);
                });
              }}
            />
            <UpdateGroupButton
              tags={tags.map(({ tag }) => tag)}
              onUpdated={() => onGroupUpdated(tags.map(({ tag }) => tag))}
            />
          </div>
          <ul className="list-none p-0 m-0 ml-6">
            {tags.map(({ tag, data }) => (
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
        </>
      )}
    </li>
  );
}
