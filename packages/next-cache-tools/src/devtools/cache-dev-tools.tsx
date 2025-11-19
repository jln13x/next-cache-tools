import { Suspense } from "react";
import { CacheTagsPanel } from "./cache-tags-panel";
import "./index.css";
import { fetchCacheTagsAction } from "./actions";

export async function CacheDevTools() {
  if (process.env["NODE_ENV"] !== "development") {
    return null;
  }

  return (
    <Suspense>
      <Devtools />
    </Suspense>
  );
}

async function Devtools() {
  const tagsArray = await fetchCacheTagsAction();

  return <CacheTagsPanel initialTags={tagsArray} />;
}
