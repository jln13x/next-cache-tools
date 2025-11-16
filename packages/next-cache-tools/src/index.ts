import { cacheLife, cacheTag, revalidateTag, updateTag } from "next/cache";
import { appendPrefix, GLOBAL_CACHE_TAG } from "./shared";

type BuiltInProfile =
  | "default"
  | "seconds"
  | "minutes"
  | "hours"
  | "days"
  | "weeks"
  | "max";

type CustomProfile = {
  stale?: number;
  revalidate?: number;
  expire?: number;
};

type CacheLifeProfile = BuiltInProfile | CustomProfile;

type BaseOptions<T> =
  | { filter: T; predicate?: never }
  | { filter?: never; predicate: (args: T) => boolean }
  | { filter?: never; predicate?: never };

type RevalidateOptions<T> = BaseOptions<T> & {
  profile?: string | { expire?: number };
};

type LifeOptions<T> = BaseOptions<T> & {
  profile?: CacheLifeProfile;
};

type ExtractTagArg<T extends (...args: any[]) => string> =
  T extends () => string ? undefined : Parameters<T>[0];

type CacheTagMethods<T> = {
  tag: T extends undefined
    ? () => void
    : T extends never
      ? () => void
      : (args: T) => void;
  life: (options?: LifeOptions<T>) => void;
  revalidate: (options?: RevalidateOptions<T>) => void;
  update: (options?: BaseOptions<T>) => void;
};

type CacheKeyFn<T = any> = T extends undefined
  ? () => string
  : (args: T) => string;

type CreateCacheTagOptions<CacheKey extends CacheKeyFn<any> | (() => string)> =
  {
    cacheKey: CacheKey;
    prefix?: string;
    cacheLife?: CacheLifeProfile;
  };

type CacheTag<T = any> = CacheTagMethods<T>;

class _CacheTag<T = any> {
  private path: string[] = [];
  private prefix?: string;
  private cacheKeyToArgs = new Map<string, T>();
  private defaultCacheLife?: CacheLifeProfile;

  constructor(
    private tags: string[] = [],
    private options: {
      cacheKey: CacheKeyFn<T>;
      prefix?: string;
      cacheLife?: CacheLifeProfile;
    },
  ) {
    this.defaultCacheLife = options.cacheLife;
  }

  setPath(path: string[], prefix?: string): void {
    this.path = path;
    this.prefix = prefix;
    for (let i = 0; i < path.length; i++) {
      const pathTag = path.slice(0, i + 1).join(".");
      const prefixedTag = prefix ? `${prefix}:${pathTag}` : pathTag;
      this.tags.push(prefixedTag);
    }
  }

  addTag(...tags: string[]): void {
    this.tags.push(...tags);
  }

  private prefixTag(tag: string): string {
    return this.prefix ? `${this.prefix}:${tag}` : tag;
  }

  tag(...args: T extends undefined ? [] : [T]): void {
    const tagsToUse = [...this.tags];
    const fullPathKey = this.path.join(".");
    const cacheKey =
      args.length === 0
        ? (this.options.cacheKey as () => string)()
        : (this.options.cacheKey as (args: T) => string)(args[0]);
    const finalTag = fullPathKey ? [fullPathKey, cacheKey].join(".") : cacheKey;

    if (args.length > 0) {
      this.cacheKeyToArgs.set(cacheKey, args[0] as T);
    }

    tagsToUse.push(this.prefixTag(finalTag));
    cacheTag(...tagsToUse);
    this.life();
  }

  life(_options?: LifeOptions<T>): void {
    const profile: CacheLifeProfile =
      _options?.profile ?? this.defaultCacheLife ?? "default";
    cacheLife(profile as any);
  }

  revalidate(options?: RevalidateOptions<T>): void {
    const profile = options?.profile || "default";

    const pathKey = this.path.join(".");

    if (options?.predicate) {
      const predicate = options.predicate;
      for (const [cacheKey, args] of this.cacheKeyToArgs) {
        if (predicate(args)) {
          const tag = [pathKey, cacheKey].join(".");
          revalidateTag(this.prefixTag(tag), profile);
        }
      }
      return;
    }

    if (options?.filter) {
      const key = this.options.cacheKey(options.filter);
      const tag = [pathKey, key].join(".");
      revalidateTag(this.prefixTag(tag), profile);
      return;
    }

    revalidateTag(this.prefixTag(pathKey), profile);
  }

  update(options?: BaseOptions<T>): void {
    if (options?.predicate) {
      const predicate = options.predicate;
      const pathKey = this.path.join(".");
      for (const [cacheKey, args] of this.cacheKeyToArgs) {
        if (predicate(args)) {
          const tag = [pathKey, cacheKey].join(".");
          updateTag(this.prefixTag(tag));
        }
      }
      return;
    }

    if (options?.filter) {
      const key = this.options.cacheKey(options.filter);
      const pathKey = this.path.join(".");
      const tag = [pathKey, key].join(".");
      updateTag(this.prefixTag(tag));
      return;
    }

    const pathKey = this.path.join(".");
    updateTag(this.prefixTag(pathKey));
  }

  getTags(): string[] {
    return this.tags;
  }
}

function createCacheTag<T extends CacheKeyFn<any> | (() => string)>(
  options: CreateCacheTagOptions<T>,
): CacheTag<ExtractTagArg<T>> {
  const tags: string[] = [GLOBAL_CACHE_TAG];
  return new _CacheTag<ExtractTagArg<T>>(tags, {
    cacheKey: options.cacheKey as any,
    cacheLife: options.cacheLife,
  }) as unknown as CacheTag<ExtractTagArg<T>>;
}

type GroupMethods = {
  revalidate: () => void;
  update: () => void;
};

type CacheTagGroup<T extends Record<string, CacheTag | CacheTagGroup<any>>> =
  T & GroupMethods;

type CreateCacheTagGroupOptions = {
  prefix?: string;
};

function collectAllTags(
  group: Record<string, CacheTag | CacheTagGroup<any>>,
): CacheTag[] {
  const tags: CacheTag[] = [];

  for (const value of Object.values(group)) {
    if (value instanceof _CacheTag) {
      tags.push(value);
    } else if (typeof value === "object" && value !== null) {
      tags.push(
        ...collectAllTags(
          value as Record<string, CacheTag | CacheTagGroup<any>>,
        ),
      );
    }
  }

  return tags;
}

function addPathTags(tag: _CacheTag, path: string[], prefix?: string): void {
  tag.setPath(path, prefix);
}

function createCacheTagGroup<
  T extends Record<string, CacheTag | CacheTagGroup<any>>,
>(
  name: string,
  group: T,
  options?: CreateCacheTagGroupOptions,
  path: string[] = [],
  rootGroupName?: string,
): CacheTagGroup<T> {
  const actualRootGroupName = rootGroupName ?? name;
  const prefixedGroupName = appendPrefix(actualRootGroupName);
  const processedGroup: Record<string, CacheTag | CacheTagGroup<any>> = {};

  for (const [key, value] of Object.entries(group)) {
    const currentPath = path.length === 0 ? [key] : [...path, key];
    if (value instanceof _CacheTag) {
      addPathTags(value, currentPath, prefixedGroupName);
      processedGroup[key] = value;
    } else if (typeof value === "object" && value !== null) {
      processedGroup[key] = createCacheTagGroup(
        key,
        value as Record<string, CacheTag | CacheTagGroup<any>>,
        options,
        currentPath,
        actualRootGroupName,
      );
    }
  }

  const allTags = collectAllTags(processedGroup);

  const groupMethods: GroupMethods = {
    revalidate: () => {
      const pathKey = path.join(".");
      const tag = pathKey
        ? `${prefixedGroupName}:${pathKey}`
        : prefixedGroupName;
      revalidateTag(tag, "default");
    },
    update: () => {
      for (const tag of allTags) {
        tag.update();
      }
    },
  };

  return Object.assign(processedGroup, groupMethods) as CacheTagGroup<T>;
}

export { createCacheTag, createCacheTagGroup };
