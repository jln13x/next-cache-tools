import { expectTypeOf, it } from "vitest";
import { createCacheTag } from "../src/index";

it("tag() requires correct arguments based on getCacheId", () => {
  const userTag = createCacheTag("user", {
    getCacheId: ({ id }: { id: string }) => id,
  });

  expectTypeOf(userTag.tag).toBeFunction();
  expectTypeOf(userTag.tag).parameter(0).toEqualTypeOf<{ id: string }>();

  // @ts-expect-error - should require id property
  userTag.tag({});

  // @ts-expect-error - id should be a string
  userTag.tag({ id: 123 });
});

it("tag() should not accept arguments when getCacheId is not provided", () => {
  const usersListTag = createCacheTag("users-list");

  expectTypeOf(usersListTag.tag).toBeFunction();
  expectTypeOf(usersListTag.tag).toEqualTypeOf<() => void>();

  // @ts-expect-error - should not accept any arguments
  usersListTag.tag({ id: "123" });
});

it("revalidate() filter should match getCacheId arguments", () => {
  const userTag = createCacheTag("user", {
    getCacheId: ({ id }: { id: string }) => id,
  });

  expectTypeOf(userTag.revalidate).toBeFunction();

  userTag.revalidate({ filter: { id: "123" } });
  userTag.revalidate({ predicate: (args) => args.id.startsWith("user") });
  userTag.revalidate({ profile: "max" });
  userTag.revalidate({ filter: { id: "123" }, profile: "max" });

  // @ts-expect-error - filter should require id property
  userTag.revalidate({ filter: {} });

  // @ts-expect-error - id should be a string
  userTag.revalidate({ filter: { id: 123 } });
});

it("update() filter should match getCacheId arguments", () => {
  const userTag = createCacheTag("user", {
    getCacheId: ({ id }: { id: string }) => id,
  });

  expectTypeOf(userTag.update).toBeFunction();

  userTag.update({ filter: { id: "123" } });
  userTag.update({ predicate: (args) => args.id.startsWith("user") });

  // @ts-expect-error - filter should require id property
  userTag.update({ filter: {} });

  // @ts-expect-error - id should be a string
  userTag.update({ filter: { id: 123 } });
});

it("revalidate() and update() should not accept filter/predicate when getCacheId is not provided", () => {
  const usersListTag = createCacheTag("users-list");

  expectTypeOf(usersListTag.revalidate).toBeFunction();
  expectTypeOf(usersListTag.update).toBeFunction();

  usersListTag.revalidate();
  usersListTag.update();

  // @ts-expect-error - should not accept filter when no getCacheId
  usersListTag.revalidate({ filter: { id: "123" } });

  // @ts-expect-error - should not accept predicate when no getCacheId
  usersListTag.revalidate({ predicate: () => true });

  // @ts-expect-error - should not accept filter when no getCacheId
  usersListTag.update({ filter: { id: "123" } });

  // @ts-expect-error - should not accept predicate when no getCacheId
  usersListTag.update({ predicate: () => true });
});
