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

type BaseOptions<T> = [T] extends [undefined]
  ? { filter?: never; predicate?: never }
  :
      | { filter: T; predicate?: never }
      | { filter?: never; predicate: (args: T) => boolean }
      | { filter?: never; predicate?: never };

type RevalidateOptions<T> = BaseOptions<T> & {
  profile?: string | { expire?: number };
};

type LifeOptions = {
  profile?: CacheLifeProfile;
};

type ExtractTagArg<T extends ((...args: any[]) => string) | undefined> =
  T extends undefined
    ? undefined
    : T extends () => string
      ? undefined
      : Parameters<Exclude<T, undefined>>[0];

type CacheTagMethods<T> = {
  tag: [T] extends [undefined]
    ? () => void
    : [T] extends [never]
      ? () => void
      : (args: T) => void;
  life: (options?: LifeOptions) => void;
  revalidate: (options?: RevalidateOptions<T>) => void;
  update: (options?: BaseOptions<T>) => void;
};

type GetCacheIdFn<T = any> = T extends undefined
  ? () => string
  : (args: T) => string;

type CreateCacheTagOptions<
  GetCacheId extends GetCacheIdFn<any> | (() => string) | undefined,
> = {
  getCacheId?: GetCacheId;
  cacheLife?: CacheLifeProfile;
};

type CacheTag<T = any> = CacheTagMethods<T>;

class _CacheTag<T = any> {
  private path: string[] = [];
  private prefix?: string;
  private cacheKeyToArgs = new Map<string, T>();
  private defaultCacheLife?: CacheLifeProfile;
  private name: string;

  constructor(
    name: string,
    private tags: string[] = [],
    private options: {
      getCacheId?: GetCacheIdFn<T>;
      cacheLife?: CacheLifeProfile;
    },
  ) {
    this.name = name;
    this.defaultCacheLife = options.cacheLife;
  }

  setPath(path: string[], prefix?: string): void {
    this.path = path;
    this.prefix = prefix;

    const standaloneTag = appendPrefix(this.name);
    const standaloneTagIndex = this.tags.indexOf(standaloneTag);
    if (standaloneTagIndex !== -1) {
      this.tags.splice(standaloneTagIndex, 1);
    }

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
    if (this.prefix) {
      return `${this.prefix}:${tag}`;
    }
    return appendPrefix(tag);
  }

  tag(...args: T extends undefined ? [] : [T]): void {
    const tagsToUse = [...this.tags];
    const fullPathKey = this.path.join(".");

    let cacheKey: string;
    if (this.options.getCacheId) {
      cacheKey =
        args.length === 0
          ? (this.options.getCacheId as () => string)()
          : (this.options.getCacheId as (args: T) => string)(args[0]);
    } else {
      cacheKey = this.name;
    }

    const finalTag = fullPathKey ? [fullPathKey, cacheKey].join(".") : cacheKey;

    if (args.length > 0 && this.options.getCacheId) {
      this.cacheKeyToArgs.set(cacheKey, args[0] as T);
    }

    tagsToUse.push(this.prefixTag(finalTag));
    cacheTag(...tagsToUse);
    this.life();
  }

  life(_options?: LifeOptions): void {
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
          const tag = pathKey ? [pathKey, cacheKey].join(".") : cacheKey;
          revalidateTag(this.prefixTag(tag), profile);
        }
      }
      return;
    }

    if (options?.filter) {
      const key = this.options.getCacheId
        ? this.options.getCacheId(options.filter)
        : this.name;
      const tag = pathKey ? [pathKey, key].join(".") : key;
      revalidateTag(this.prefixTag(tag), profile);
      return;
    }

    const tagToRevalidate = pathKey || this.name;
    revalidateTag(this.prefixTag(tagToRevalidate), profile);
  }

  update(options?: BaseOptions<T>): void {
    if (options?.predicate) {
      const predicate = options.predicate;
      const pathKey = this.path.join(".");
      for (const [cacheKey, args] of this.cacheKeyToArgs) {
        if (predicate(args)) {
          const tag = pathKey ? [pathKey, cacheKey].join(".") : cacheKey;
          updateTag(this.prefixTag(tag));
        }
      }
      return;
    }

    if (options?.filter) {
      const key = this.options.getCacheId
        ? this.options.getCacheId(options.filter)
        : this.name;
      const pathKey = this.path.join(".");
      const tag = pathKey ? [pathKey, key].join(".") : key;
      updateTag(this.prefixTag(tag));
      return;
    }

    const pathKey = this.path.join(".");
    const tagToUpdate = pathKey || this.name;
    updateTag(this.prefixTag(tagToUpdate));
  }

  getTags(): string[] {
    return this.tags;
  }
}

function createCacheTag<
  T extends GetCacheIdFn<any> | (() => string) | undefined = undefined,
>(
  name: string,
  options?: CreateCacheTagOptions<T>,
): CacheTag<ExtractTagArg<T>> {
  const tags: string[] = [GLOBAL_CACHE_TAG, appendPrefix(name)];
  return new _CacheTag<ExtractTagArg<T>>(name, tags, {
    getCacheId: options?.getCacheId as any,
    cacheLife: options?.cacheLife,
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
