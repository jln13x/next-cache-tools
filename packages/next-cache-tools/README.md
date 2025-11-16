# Next Cache Tools

A powerful TypeScript-first library for managing Next.js cache tags with type safety, grouping, and developer tools.

## Features

- 🏷️ **Type-safe cache tags** - Create cache tags with full TypeScript support
- 📦 **Tag grouping** - Organize related cache tags into logical groups
- 🔄 **Selective revalidation** - Revalidate specific cache entries by filter or predicate
- 🎯 **Predicate-based filtering** - Revalidate multiple entries matching a pattern
- 🛠️ **Devtools panel** - Visual interface for inspecting and managing cache tags (development only)
- ⚡ **Next.js 16+ compatible** - Built for the latest Next.js cache APIs

## Installation

```bash
pnpm add next-cache-tools
```

## Requirements

- Next.js >= 16
- React >= 19
- React DOM >= 19

## Quick Start

### Basic Cache Tag

```typescript
import { createCacheTag } from "next-cache-tools";

const userTag = createCacheTag({
  cacheKey: ({ id }: { id: string }) => id,
});

async function getUser(id: string) {
  "use cache";
  
  userTag.tag({ id });
  userTag.life({ profile: "max" });
  
  return { id, name: `User ${id}` };
}
```

### Cache Tag Groups

```typescript
import { createCacheTag, createCacheTagGroup } from "next-cache-tools";

const byIdCacheTag = createCacheTag({
  cacheKey: ({ id }: { id: string }) => id,
});

const byEmailCacheTag = createCacheTag({
  cacheKey: ({ email }: { email: string }) => email,
});

export const cacheGroup = createCacheTagGroup("users", {
  user: {
    byId: byIdCacheTag,
    byEmail: byEmailCacheTag,
  },
});
```

### Using Cache Tags

```typescript
import { cacheGroup } from "@/app/cache";

async function getUserById(id: string) {
  "use cache";
  
  cacheGroup.user.byId.tag({ id });
  cacheGroup.user.byId.life({ profile: "max" });
  
  return { id, name: `User ${id}` };
}
```

### Revalidating Cache

```typescript
// Revalidate a specific user
async function updateUser(id: string) {
  "use server";
  
  await updateUserInDatabase(id);
  
  cacheGroup.user.byId.update({
    filter: { id },
  });
}

// Revalidate multiple users using a predicate
async function revalidateUsersStartingWith(prefix: string) {
  "use server";
  
  cacheGroup.user.byId.revalidate({
    predicate: (args) => args.id.startsWith(prefix),
  });
}

// Example: Revalidate all categories starting with "s"
const categoryTag = createCacheTag({
  cacheKey: ({ name }: { name: string }) => name,
});

categoryTag.revalidate({
  predicate: (args) => args.name.startsWith("s"),
});

// Revalidate all users
async function refreshAllUsers() {
  "use server";
  
  cacheGroup.update();
}
```

## API Reference

### `createCacheTag(options)`

Creates a cache tag with a custom cache key function.

**Options:**
- `cacheKey`: Function that generates the cache key from arguments
- `prefix?`: Optional prefix for the tag
- `cacheLife?`: Default cache life profile

**Returns:** A `CacheTag` object with methods:
- `tag(args?)`: Tag the current cache entry
- `life(options?)`: Set cache life profile
- `revalidate(options?)`: Revalidate matching cache entries
  - `filter`: Revalidate a specific entry by value (mutually exclusive with `predicate`)
  - `predicate`: Revalidate entries matching a predicate function (mutually exclusive with `filter`)
  - `profile?`: Cache profile to use for revalidation
- `update(options?)`: Update matching cache entries
  - `filter`: Update a specific entry by value (mutually exclusive with `predicate`)
  - `predicate`: Update entries matching a predicate function (mutually exclusive with `filter`)

**Example:**

```typescript
const userTag = createCacheTag({
  cacheKey: ({ id }: { id: string }) => id,
});

// Tag without arguments (if cacheKey takes no args)
const globalTag = createCacheTag({
  cacheKey: () => "global",
});
```

### `createCacheTagGroup(name, group, options?)`

Creates a group of related cache tags.

**Parameters:**
- `name`: Name of the group
- `group`: Object containing cache tags or nested groups
- `options?`: Optional configuration
  - `prefix?`: Custom prefix for group tags

**Returns:** A `CacheTagGroup` with:
- All nested tags and groups as properties
- `revalidate()`: Revalidate all tags in the group
- `update()`: Update all tags in the group

**Example:**

```typescript
const cacheGroup = createCacheTagGroup("users", {
  user: {
    byId: userByIdTag,
    byEmail: userByEmailTag,
  },
  posts: {
    byId: postByIdTag,
  },
});

// Access nested tags
cacheGroup.user.byId.tag({ id: "123" });

// Revalidate all users
cacheGroup.user.revalidate();

// Update all tags in the group
cacheGroup.update();
```

### Cache Life Profiles

Use the `.life()` method on cache tags with built-in profiles or custom options:

```typescript
const userTag = createCacheTag({
  cacheKey: ({ id }: { id: string }) => id,
});

// Built-in profiles
userTag.life({ profile: "default" });
userTag.life({ profile: "seconds" });
userTag.life({ profile: "minutes" });
userTag.life({ profile: "hours" });
userTag.life({ profile: "days" });
userTag.life({ profile: "weeks" });
userTag.life({ profile: "max" });

// Custom profile
userTag.life({
  profile: {
    stale: 5,       
    revalidate: 60, 
    expire: 300,    
  },
});
```

## Devtools

The package includes a development-only devtools panel for inspecting and managing cache tags.

### Setup

Add the devtools component to your root layout:

```typescript
import { NextCacheToolsDevtools } from "next-cache-tools/devtools";
import { Suspense } from "react";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body>
        {children}
        <Suspense>
          <NextCacheToolsDevtools />
        </Suspense>
      </body>
    </html>
  );
}
```

The devtools panel will automatically appear in development mode, showing:
- All cache tags with their associated data
- Grouped tags organized by namespace
- Search functionality
- Individual tag revalidation
- Group revalidation
- Real-time polling (every 2 seconds)

## Examples

### Standalone Tag

```typescript
const standaloneTag = createCacheTag({
  cacheKey: () => "standalone",
});

async function getData() {
  "use cache";
  standaloneTag.tag();
  return { data: "value" };
}
```

### Parameterized Tag

```typescript
const productTag = createCacheTag({
  cacheKey: ({ id, category }: { id: string; category: string }) => 
    `${category}-${id}`,
});

async function getProduct(id: string, category: string) {
  "use cache";
  productTag.tag({ id, category });
  return { id, category, name: "Product" };
}
```

### Nested Groups

```typescript
const cacheGroup = createCacheTagGroup("ecommerce", {
  products: {
    byId: productByIdTag,
    byCategory: productByCategoryTag,
  },
  orders: {
    byId: orderByIdTag,
    byUser: orderByUserTag,
  },
});

// Revalidate all products
cacheGroup.products.revalidate();

// Revalidate specific product
cacheGroup.products.byId.update({ filter: { id: "123" } });

// Revalidate products matching a pattern using predicate
cacheGroup.products.byId.revalidate({
  predicate: (args) => args.id.startsWith("prod-"),
});
```

### Predicate-Based Revalidation

Use predicate functions to revalidate multiple cache entries that match a pattern:

```typescript
const categoryTag = createCacheTag({
  cacheKey: ({ name }: { name: string }) => name,
});

// Tag multiple categories
categoryTag.tag({ name: "sports" });
categoryTag.tag({ name: "shoes" });
categoryTag.tag({ name: "electronics" });
categoryTag.tag({ name: "books" });

// Revalidate only categories starting with "s"
categoryTag.revalidate({
  predicate: (args) => args.name.startsWith("s"),
});
// This will revalidate "sports" and "shoes"

// Update all categories containing "e"
categoryTag.update({
  predicate: (args) => args.name.includes("e"),
});
// This will update "electronics" and "shoes"
```

The predicate function receives the same arguments that were passed to `tag()`, allowing you to filter based on the original cache key arguments.

