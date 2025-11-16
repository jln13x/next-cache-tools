import { cacheLife } from "next/cache";
import { createCacheTag } from "next-cache-tools";
import { cacheGroup } from "@/app/cache";

const standalone = createCacheTag({
  cacheKey: () => "standalone",
});

const fastExpiry = createCacheTag({
  cacheKey: () => "fast-expiry",
});

const staleTag = createCacheTag({
  cacheKey: () => "stale-data",
});

async function delayedCache() {
  "use cache";
  standalone.tag();

  return {
    delayed: "foo_bar",
    timestamp: Date.now(),
  };
}

async function getFastExpiry() {
  "use cache";
  console.log("[page] getFastExpiry called");

  fastExpiry.tag();
  cacheLife({ expire: 5 });

  return {
    type: "fast-expiry",
    timestamp: Date.now(),
  };
}

async function getStaleData() {
  "use cache";
  console.log("[page] getStaleData called");

  staleTag.tag();
  cacheLife({ stale: 5, revalidate: 60, expire: 300 });

  return {
    type: "stale-data",
    timestamp: Date.now(),
  };
}

async function getUserById(id: string) {
  "use cache";
  console.log(`[page] getUserById called for id: ${id}`);

  cacheGroup.user.byId.tag({ id });
  cacheLife("max");

  return {
    id,
    name: `User ${id}`,
    email: `user${id}@example.com`,
    timestamp: Date.now(),
  };
}

export default async function Page() {
  const user1 = await getUserById("user-1");
  const user2 = await getUserById("user-2");
  const user3 = await getUserById("user-3");
  const admin1 = await getUserById("admin-1");
  const fastExpiryData = await getFastExpiry();
  const staleData = await getStaleData();

  const revalidateUser1 = async () => {
    "use server";
    cacheGroup.user.byId.update({
      filter: { id: "user-1" },
    });
  };

  const revalidateUser2 = async () => {
    "use server";
    cacheGroup.user.byId.update({
      filter: { id: "user-2" },
    });
  };

  const delayed = async () => {
    "use server";
    await delayedCache();
  };

  const revalidateAllUsers = async () => {
    "use server";
    cacheGroup.user.byId.update({
      predicate: (args) => args.id.startsWith("user-"),
    });
  };

  const revalidateAllAdmins = async () => {
    "use server";
    cacheGroup.user.byId.update({
      predicate: (args) => args.id.startsWith("admin-"),
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-4xl font-bold text-slate-900 mb-8">
          Next.js Cache Tools Demo
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">
              User 1
            </h2>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-slate-600">ID:</span>{" "}
                <span className="text-slate-900">{user1.id}</span>
              </div>
              <div>
                <span className="font-medium text-slate-600">Name:</span>{" "}
                <span className="text-slate-900">{user1.name}</span>
              </div>
              <div>
                <span className="font-medium text-slate-600">Email:</span>{" "}
                <span className="text-slate-900">{user1.email}</span>
              </div>
              <div>
                <span className="font-medium text-slate-600">Timestamp:</span>{" "}
                <span className="text-slate-500 font-mono text-xs">
                  {new Date(user1.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={revalidateUser1}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              Revalidate User 1
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">
              User 2
            </h2>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-slate-600">ID:</span>{" "}
                <span className="text-slate-900">{user2.id}</span>
              </div>
              <div>
                <span className="font-medium text-slate-600">Name:</span>{" "}
                <span className="text-slate-900">{user2.name}</span>
              </div>
              <div>
                <span className="font-medium text-slate-600">Email:</span>{" "}
                <span className="text-slate-900">{user2.email}</span>
              </div>
              <div>
                <span className="font-medium text-slate-600">Timestamp:</span>{" "}
                <span className="text-slate-500 font-mono text-xs">
                  {new Date(user2.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={revalidateUser2}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              Revalidate User 2
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">
              Fast Expiry (5s)
            </h2>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-slate-600">Type:</span>{" "}
                <span className="text-slate-900">{fastExpiryData.type}</span>
              </div>
              <div>
                <span className="font-medium text-slate-600">Timestamp:</span>{" "}
                <span className="text-slate-500 font-mono text-xs">
                  {new Date(fastExpiryData.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
            <div className="mt-3 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-xs text-yellow-800">
                This cache expires after 5 seconds
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">
              Stale Data
            </h2>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-slate-600">Type:</span>{" "}
                <span className="text-slate-900">{staleData.type}</span>
              </div>
              <div>
                <span className="font-medium text-slate-600">Timestamp:</span>{" "}
                <span className="text-slate-500 font-mono text-xs">
                  {new Date(staleData.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
            <div className="mt-3 px-3 py-2 bg-purple-50 border border-purple-200 rounded-md">
              <p className="text-xs text-purple-800">
                Stale: 5s | Revalidate: 60s | Expire: 300s
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">
              User 3
            </h2>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-slate-600">ID:</span>{" "}
                <span className="text-slate-900">{user3.id}</span>
              </div>
              <div>
                <span className="font-medium text-slate-600">Name:</span>{" "}
                <span className="text-slate-900">{user3.name}</span>
              </div>
              <div>
                <span className="font-medium text-slate-600">Email:</span>{" "}
                <span className="text-slate-900">{user3.email}</span>
              </div>
              <div>
                <span className="font-medium text-slate-600">Timestamp:</span>{" "}
                <span className="text-slate-500 font-mono text-xs">
                  {new Date(user3.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">
              Admin 1
            </h2>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-slate-600">ID:</span>{" "}
                <span className="text-slate-900">{admin1.id}</span>
              </div>
              <div>
                <span className="font-medium text-slate-600">Name:</span>{" "}
                <span className="text-slate-900">{admin1.name}</span>
              </div>
              <div>
                <span className="font-medium text-slate-600">Email:</span>{" "}
                <span className="text-slate-900">{admin1.email}</span>
              </div>
              <div>
                <span className="font-medium text-slate-600">Timestamp:</span>{" "}
                <span className="text-slate-500 font-mono text-xs">
                  {new Date(admin1.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">
            Predicate-Based Revalidation Examples
          </h2>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800 mb-2">
                <strong>Example:</strong> Revalidate all users whose ID starts
                with "user-"
              </p>
              <code className="text-xs bg-white px-2 py-1 rounded block">
                cacheGroup.user.byId.revalidate({`{`}
                <br />
                {"  "}predicate: (args) =&gt; args.id.startsWith("user-"),
                <br />
                {`}`});
              </code>
            </div>
            <div className="flex gap-4 flex-wrap">
              <button
                type="button"
                onClick={revalidateAllUsers}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors font-medium"
              >
                Revalidate All Users (user-*)
              </button>
              <button
                type="button"
                onClick={revalidateAllAdmins}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors font-medium"
              >
                Revalidate All Admins (admin-*)
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">Actions</h2>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={delayed}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
            >
              Trigger Delayed Cache
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
