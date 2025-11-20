![Devtools Panel](https://next-cache-tools.com/devtools.png)

# Next Cache Tools

[![NPM](https://img.shields.io/npm/v/next-cache-tools?color=red)](https://www.npmjs.com/package/next-cache-tools)
[![MIT License](https://img.shields.io/github/license/jln13x/next-cache-tools.svg?color=blue)](https://github.com/jln13x/next-cache-tools/blob/main/LICENSE)

Manage cache tags in Next.js with type safety, grouping, and developer tools.

## Features

- **Typesafe cache tag management**
- **Organize tags in nested structures**
- **Fine-grained cache revalidation & updates**
- **Devtools to visualize your cache**

[Documentation »](https://next-cache-tools.com/)

## Getting Started

```bash
pnpm install next-cache-tools
```

## Quick Start

### Tag

```typescript
import { createCacheTag } from "next-cache-tools";

const userTag = createCacheTag("user", {
  getCacheId: ({ id }: { id: string }) => id,
});

async function getUser(id: string) {
  "use cache";
  userTag.tag({ id });
  return { id, name: `User ${id}` };
}

// Revalidate
userTag.revalidate({ filter: { id: "user-123" } });
```

### Groups

```typescript
import { createCacheTag, createCacheTagGroup } from "next-cache-tools";

export const cacheGroup = createCacheTagGroup("app", {
  user: {
    byId: createCacheTag("byId", {
      getCacheId: ({ id }: { id: string }) => id,
      // Optional cache life profile
      cacheLife: "minutes",
    }),
  },
});

async function getUserById(id: string) {
  "use cache";
  cacheGroup.user.byId.tag({ id });
  return { id, name: `User ${id}` };
}

// Revalidate all users
cacheGroup.user.revalidate();

// Revalidate entire group
cacheGroup.revalidate();

```

### Devtools

Visual panel to inspect and manage cache tags in development. 

See [Devtools documentation](https://next-cache-tools.com/docs/devtools) for setup instructions.


