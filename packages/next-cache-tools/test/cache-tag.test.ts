import { cacheTag, revalidateTag, updateTag } from "next/cache";
import { describe, expect, it, vi } from "vitest";
import { createCacheTag, createCacheTagGroup } from "../src/index";
import { appendPrefix, GLOBAL_CACHE_TAG } from "../src/shared";

vi.mock("next/cache", () => ({
  cacheTag: vi.fn(),
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
  cacheLife: vi.fn(),
}));

describe("createCacheTag", () => {
  it("contains global tag", () => {
    const tag = createCacheTag("user", {
      getCacheId: (id: string) => id,
    }) as any;

    expect(tag).toBeDefined();
    expect(tag.getTags()).toContain(GLOBAL_CACHE_TAG);
  });

  it("works without getCacheId option", () => {
    const tag = createCacheTag("metrics") as any;

    expect(tag).toBeDefined();
    expect(tag.getTags()).toContain(GLOBAL_CACHE_TAG);
    expect(tag.getTags()).toContain(appendPrefix("metrics"));

    vi.clearAllMocks();
    tag.tag();
    expect(cacheTag).toHaveBeenCalledWith(
      GLOBAL_CACHE_TAG,
      appendPrefix("metrics"),
      appendPrefix("metrics"),
    );
  });

  it("includes prefixed tag name when calling tag() on standalone tag", () => {
    const userTag = createCacheTag("user") as any;

    vi.clearAllMocks();
    userTag.tag();
    expect(cacheTag).toHaveBeenCalledWith(
      GLOBAL_CACHE_TAG,
      appendPrefix("user"),
      appendPrefix("user"),
    );
  });

  it("revalidates standalone tag with prefixed name", () => {
    const userTag = createCacheTag("user") as any;

    vi.clearAllMocks();
    userTag.revalidate();
    expect(revalidateTag).toHaveBeenCalledWith(appendPrefix("user"), "default");
  });

  it("updates standalone tag with prefixed name", () => {
    const userTag = createCacheTag("user") as any;

    vi.clearAllMocks();
    userTag.update();
    expect(updateTag).toHaveBeenCalledWith(appendPrefix("user"));
  });

  it("revalidates and updates path tag when no options provided", () => {
    const userTag = createCacheTag("user", {
      getCacheId: (id: string) => id,
    }) as any;

    const group = createCacheTagGroup("users", {
      byId: userTag,
    }) as any;

    vi.clearAllMocks();
    group.byId.revalidate();
    expect(revalidateTag).toHaveBeenCalledWith(
      `${appendPrefix("users")}:byId`,
      "default",
    );
    expect(revalidateTag).toHaveBeenCalledTimes(1);

    vi.clearAllMocks();
    group.byId.update();
    expect(updateTag).toHaveBeenCalledWith(`${appendPrefix("users")}:byId`);
    expect(updateTag).toHaveBeenCalledTimes(1);
  });

  it("handles filter option for revalidate and update", () => {
    const userTag = createCacheTag("user", {
      getCacheId: (id: string) => id,
    }) as any;

    const group = createCacheTagGroup("users", {
      byId: userTag,
    }) as any;

    vi.clearAllMocks();
    group.byId.revalidate({ filter: "123" });
    expect(revalidateTag).toHaveBeenCalledWith(
      `${appendPrefix("users")}:byId.123`,
      "default",
    );
    expect(revalidateTag).toHaveBeenCalledTimes(1);

    vi.clearAllMocks();
    group.byId.update({ filter: "123" });
    expect(updateTag).toHaveBeenCalledWith(`${appendPrefix("users")}:byId.123`);
    expect(updateTag).toHaveBeenCalledTimes(1);
  });

  it("handles predicate matching multiple tags for revalidate and update", () => {
    const userTag = createCacheTag("user", {
      getCacheId: (id: string) => id,
    });

    const group = createCacheTagGroup("users", {
      byId: userTag,
    });

    group.byId.tag("user-1");
    group.byId.tag("user-2");
    group.byId.tag("admin-1");

    vi.clearAllMocks();
    group.byId.revalidate({
      predicate: (args) => args.startsWith("user-"),
    });
    expect(revalidateTag).toHaveBeenCalledTimes(2);
    expect(revalidateTag).toHaveBeenCalledWith(
      `${appendPrefix("users")}:byId.user-1`,
      "default",
    );
    expect(revalidateTag).toHaveBeenCalledWith(
      `${appendPrefix("users")}:byId.user-2`,
      "default",
    );
    expect(revalidateTag).not.toHaveBeenCalledWith(
      `${appendPrefix("users")}:byId.admin-1`,
      "default",
    );

    vi.clearAllMocks();
    group.byId.update({
      predicate: (args) => args.startsWith("user-"),
    });
    expect(updateTag).toHaveBeenCalledTimes(2);
    expect(updateTag).toHaveBeenCalledWith(
      `${appendPrefix("users")}:byId.user-1`,
    );
    expect(updateTag).toHaveBeenCalledWith(
      `${appendPrefix("users")}:byId.user-2`,
    );
    expect(updateTag).not.toHaveBeenCalledWith(
      `${appendPrefix("users")}:byId.admin-1`,
    );
  });

  it("handles predicate matching nothing for revalidate and update", () => {
    const userTag = createCacheTag("user", {
      getCacheId: (id: string) => id,
    });

    const group = createCacheTagGroup("users", {
      byId: userTag,
    });

    group.byId.tag("user-1");
    group.byId.tag("user-2");

    vi.clearAllMocks();
    group.byId.revalidate({
      predicate: (args) => args.startsWith("admin-"),
    });
    expect(revalidateTag).toHaveBeenCalledTimes(0);

    vi.clearAllMocks();
    group.byId.update({
      predicate: (args) => args.startsWith("admin-"),
    });
    expect(updateTag).toHaveBeenCalledTimes(0);
  });

  it("handles predicate when no tags have been created for revalidate and update", () => {
    const userTag = createCacheTag("user", {
      getCacheId: (id: string) => id,
    });

    const group = createCacheTagGroup("users", {
      byId: userTag,
    });

    vi.clearAllMocks();
    group.byId.revalidate({
      predicate: (args) => args.startsWith("user-"),
    });
    expect(revalidateTag).toHaveBeenCalledTimes(0);

    vi.clearAllMocks();
    group.byId.update({
      predicate: (args) => args.startsWith("user-"),
    });
    expect(updateTag).toHaveBeenCalledTimes(0);
  });

  it("handles predicate with object arguments for revalidate and update", () => {
    const categoryTag = createCacheTag("category", {
      getCacheId: ({ name }: { name: string }) => name,
    });

    const group = createCacheTagGroup("categories", {
      byName: categoryTag,
    });

    group.byName.tag({ name: "sports" });
    group.byName.tag({ name: "shoes" });
    group.byName.tag({ name: "electronics" });
    group.byName.tag({ name: "books" });

    vi.clearAllMocks();
    group.byName.revalidate({
      predicate: (args) => args.name.startsWith("s"),
    });
    expect(revalidateTag).toHaveBeenCalledTimes(2);
    expect(revalidateTag).toHaveBeenCalledWith(
      `${appendPrefix("categories")}:byName.sports`,
      "default",
    );
    expect(revalidateTag).toHaveBeenCalledWith(
      `${appendPrefix("categories")}:byName.shoes`,
      "default",
    );

    vi.clearAllMocks();
    group.byName.update({
      predicate: (args) => args.name.startsWith("s"),
    });
    expect(updateTag).toHaveBeenCalledTimes(2);
    expect(updateTag).toHaveBeenCalledWith(
      `${appendPrefix("categories")}:byName.sports`,
    );
    expect(updateTag).toHaveBeenCalledWith(
      `${appendPrefix("categories")}:byName.shoes`,
    );
  });

  it("handles predicate with complex conditions for revalidate and update", () => {
    const userTag = createCacheTag("user", {
      getCacheId: ({ id }: { id: string }) => id,
    });

    const group = createCacheTagGroup("users", {
      byId: userTag,
    });

    group.byId.tag({ id: "user-1" });
    group.byId.tag({ id: "user-2" });
    group.byId.tag({ id: "user-10" });
    group.byId.tag({ id: "admin-1" });

    vi.clearAllMocks();
    group.byId.revalidate({
      predicate: (args) => args.id.startsWith("user-") && args.id.includes("1"),
    });
    expect(revalidateTag).toHaveBeenCalledTimes(2);
    expect(revalidateTag).toHaveBeenCalledWith(
      `${appendPrefix("users")}:byId.user-1`,
      "default",
    );
    expect(revalidateTag).toHaveBeenCalledWith(
      `${appendPrefix("users")}:byId.user-10`,
      "default",
    );

    vi.clearAllMocks();
    group.byId.update({
      predicate: (args) => args.id.startsWith("user-") && args.id.includes("1"),
    });
    expect(updateTag).toHaveBeenCalledTimes(2);
    expect(updateTag).toHaveBeenCalledWith(
      `${appendPrefix("users")}:byId.user-1`,
    );
    expect(updateTag).toHaveBeenCalledWith(
      `${appendPrefix("users")}:byId.user-10`,
    );
  });
});

describe("createCacheTagGroup", () => {
  it("checks tags of a group", () => {
    const userTag = createCacheTag("user", {
      getCacheId: (id: string) => `user-${id}`,
    }) as any;
    const postTag = createCacheTag("post", {
      getCacheId: (id: string) => `post-${id}`,
    }) as any;

    const userGroup = createCacheTagGroup("user", {
      byId: userTag,
    }) as any;
    const postGroup = createCacheTagGroup("post", {
      tag: postTag,
    }) as any;

    expect(userGroup.byId.getTags()).toEqual(
      expect.arrayContaining(["_nct_", `${appendPrefix("user")}:byId`]),
    );
    expect(userGroup.byId.getTags()).not.toContain(appendPrefix("user"));
    expect(postGroup.tag.getTags()).toContain("_nct_");
    expect(postGroup.tag.getTags()).not.toContain(appendPrefix("post"));
  });

  it("replaces standalone tag with group-prefixed tag when added to group", () => {
    const metricsTag = createCacheTag("metrics") as any;

    expect(metricsTag.getTags()).toContain(appendPrefix("metrics"));

    const group = createCacheTagGroup("dashboard", {
      metrics: metricsTag,
    }) as any;

    expect(group.metrics.getTags()).toContain(
      `${appendPrefix("dashboard")}:metrics`,
    );
    expect(group.metrics.getTags()).not.toContain(appendPrefix("metrics"));
  });

  it("includes group prefix in nested structure tags", () => {
    const profileTag = createCacheTag("profile", {
      getCacheId: ({ id }: { id: string }) => id,
    }) as any;

    const group = createCacheTagGroup("dashboard", {
      users: {
        profile: profileTag,
      },
    }) as any;

    vi.clearAllMocks();
    group.users.profile.tag({ id: "123" });

    expect(cacheTag).toHaveBeenCalledWith(
      "_nct_",
      `${appendPrefix("dashboard")}:users`,
      `${appendPrefix("dashboard")}:users.profile`,
      `${appendPrefix("dashboard")}:users.profile.123`,
    );
  });

  it("includes path-based tags with arguments when calling tag()", () => {
    const userTag = createCacheTag("user", {
      getCacheId: (id: string) => id,
    }) as any;

    const group = createCacheTagGroup("users", {
      byId: userTag,
    }) as any;

    group.byId.tag("123");

    expect(cacheTag).toHaveBeenCalledWith(
      "_nct_",
      `${appendPrefix("users")}:byId`,
      `${appendPrefix("users")}:byId.123`,
    );
  });

  it("revalidates root and nested group tags", () => {
    const userTag = createCacheTag("user", {
      getCacheId: (id: string) => `user-${id}`,
    }) as any;

    const group = createCacheTagGroup("users", {
      byId: userTag,
    }) as any;

    vi.clearAllMocks();
    group.revalidate();
    expect(revalidateTag).toHaveBeenCalledWith(
      appendPrefix("users"),
      "default",
    );
    expect(revalidateTag).toHaveBeenCalledTimes(1);

    const postTag = createCacheTag("post", {
      getCacheId: (id: string) => `post-${id}`,
    }) as any;

    const nestedGroup = createCacheTagGroup("main", {
      user: createCacheTagGroup("user", {
        byId: userTag,
      }) as any,
      post: postTag,
    }) as any;

    vi.clearAllMocks();
    nestedGroup.user.revalidate();
    expect(revalidateTag).toHaveBeenCalledWith(
      `${appendPrefix("main")}:user`,
      "default",
    );
    expect(revalidateTag).toHaveBeenCalledTimes(1);
  });

  it("updates all tags in a group when calling update() on root group", () => {
    const userByIdTag = createCacheTag("userById", {
      getCacheId: (id: string) => id,
    });
    const userByEmailTag = createCacheTag("userByEmail", {
      getCacheId: (email: string) => email,
    });
    const postTag = createCacheTag("post", {
      getCacheId: (id: string) => id,
    });

    const group = createCacheTagGroup("main", {
      users: {
        byId: userByIdTag,
        byEmail: userByEmailTag,
      },
      posts: {
        byId: postTag,
      },
    });

    group.users.byId.tag("user-1");
    group.users.byId.tag("user-2");
    group.users.byEmail.tag("user1@example.com");
    group.posts.byId.tag("post-1");

    vi.clearAllMocks();
    group.update();

    expect(updateTag).toHaveBeenCalledTimes(3);
    expect(updateTag).toHaveBeenCalledWith(
      `${appendPrefix("main")}:users.byId`,
    );
    expect(updateTag).toHaveBeenCalledWith(
      `${appendPrefix("main")}:users.byEmail`,
    );
    expect(updateTag).toHaveBeenCalledWith(
      `${appendPrefix("main")}:posts.byId`,
    );
  });

  it("updates all tags in a nested group when calling update() on nested group", () => {
    const userByIdTag = createCacheTag("userById", {
      getCacheId: (id: string) => id,
    });
    const userByEmailTag = createCacheTag("userByEmail", {
      getCacheId: (email: string) => email,
    });
    const postTag = createCacheTag("post", {
      getCacheId: (id: string) => id,
    });

    const usersGroup = createCacheTagGroup("users", {
      byId: userByIdTag,
      byEmail: userByEmailTag,
    });

    const group = createCacheTagGroup("main", {
      users: usersGroup,
      posts: {
        byId: postTag,
      },
    });

    group.users.byId.tag("user-1");
    group.users.byId.tag("user-2");
    group.users.byEmail.tag("user1@example.com");
    group.posts.byId.tag("post-1");

    vi.clearAllMocks();
    group.users.update();

    expect(updateTag).toHaveBeenCalledTimes(2);
    expect(updateTag).toHaveBeenCalledWith(
      `${appendPrefix("main")}:users.byId`,
    );
    expect(updateTag).toHaveBeenCalledWith(
      `${appendPrefix("main")}:users.byEmail`,
    );
    expect(updateTag).not.toHaveBeenCalledWith(
      `${appendPrefix("main")}:posts.byId`,
    );
  });

  it("updates all tags in deeply nested structure when calling update()", () => {
    const userByIdTag = createCacheTag("userById", {
      getCacheId: (id: string) => id,
    });
    const userByEmailTag = createCacheTag("userByEmail", {
      getCacheId: (email: string) => email,
    });
    const postByIdTag = createCacheTag("postById", {
      getCacheId: (id: string) => id,
    });
    const commentTag = createCacheTag("comment", {
      getCacheId: (id: string) => id,
    });

    const commentsGroup = createCacheTagGroup("comments", {
      byId: commentTag,
    });

    const postsGroup = createCacheTagGroup("posts", {
      byId: postByIdTag,
      comments: commentsGroup,
    });

    const usersGroup = createCacheTagGroup("users", {
      byId: userByIdTag,
      byEmail: userByEmailTag,
    });

    const contentGroup = createCacheTagGroup("content", {
      users: usersGroup,
      posts: postsGroup,
    });

    const group = createCacheTagGroup("app", {
      content: contentGroup,
    });

    group.content.users.byId.tag("user-1");
    group.content.users.byEmail.tag("user1@example.com");
    group.content.posts.byId.tag("post-1");
    group.content.posts.comments.byId.tag("comment-1");

    vi.clearAllMocks();
    group.content.update();

    expect(updateTag).toHaveBeenCalledTimes(4);
    expect(updateTag).toHaveBeenCalledWith(
      `${appendPrefix("app")}:content.users.byId`,
    );
    expect(updateTag).toHaveBeenCalledWith(
      `${appendPrefix("app")}:content.users.byEmail`,
    );
    expect(updateTag).toHaveBeenCalledWith(
      `${appendPrefix("app")}:content.posts.byId`,
    );
    expect(updateTag).toHaveBeenCalledWith(
      `${appendPrefix("app")}:content.posts.comments.byId`,
    );
  });
});
