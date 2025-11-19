import { cacheLife, cacheTag, revalidateTag } from "next/cache";
import { dashboardCache } from "./cache";

async function getMetrics() {
  "use cache";
  dashboardCache.metrics.tag();
  dashboardCache.metrics.life({
    profile: {
      expire: 2,
    },
  });

  return {
    cpu: Math.round(Math.random() * 100),
    memory: Math.round(Math.random() * 16000),
    activeUsers: Math.floor(Math.random() * 1000),
    timestamp: Date.now(),
    version: Math.random(),
  };
}

async function getSystemAlerts() {
  "use cache";
  dashboardCache.alerts.tag();
  dashboardCache.alerts.life({ profile: "max" });

  const alerts = [
    "System operating normally.",
    "Scheduled maintenance at 00:00 UTC.",
    "New features deployed successfully.",
  ];

  const status = Math.random() > 0.5 ? "Healthy" : "Attention Needed";

  return {
    status,
    message: alerts[Math.floor(Math.random() * alerts.length)],
    timestamp: Date.now(),
  };
}

async function getSystemAlerts2() {
  "use cache";
  dashboardCache.alerts.tag();
  dashboardCache.alerts.life({ profile: "max" });

  return {
    status: "Healthy",
  };
}

async function getUserProfile(id: string) {
  "use cache";
  dashboardCache.users.profile.tag({ id });
  dashboardCache.users.profile.life({ profile: "max" });

  const names: Record<string, string> = {
    "user-1": "Alice Chen",
    "user-2": "Bob Smith",
    "user-3": "Charlie Davis",
  };

  const roles: Record<string, string> = {
    "user-1": "Admin",
    "user-2": "Editor",
    "user-3": "Viewer",
  };

  return {
    id,
    name: names[id] || `User ${id}`,
    role: roles[id] || "User",
    lastSeen: new Date().toISOString(),
    timestamp: Date.now(),
  };
}

async function getExternalData() {
  "use cache";
  cacheTag("external", "api-data");
  cacheLife({ expire: 10 });

  return {
    source: "External API",
    version: "1.2.3",
    status: "operational",
    timestamp: Date.now(),
  };
}

async function updateAlerts() {
  "use server";
  dashboardCache.alerts.update();
}

async function updateUser(id: string) {
  "use server";
  dashboardCache.users.profile.update({ filter: { id } });
}

async function updateAllUsers() {
  "use server";
  dashboardCache.users.profile.update();
}

async function updateExternal() {
  "use server";
  revalidateTag("external", "default");
}

function Card({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col ${className}`}
    >
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
        <h3 className="font-semibold text-slate-900">{title}</h3>
      </div>
      <div className="p-6 flex-1 flex flex-col">{children}</div>
    </div>
  );
}

function Badge({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning";
}) {
  const colors = {
    default: "bg-slate-100 text-slate-700",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
  };

  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[variant]} border-transparent`}
    >
      {children}
    </span>
  );
}

function Timestamp({ time }: { time: number }) {
  return (
    <div className="text-xs text-slate-400 font-mono mt-auto pt-4 flex justify-between items-center">
      <span>Cached at:</span>
      <span>{new Date(time).toLocaleTimeString()}</span>
    </div>
  );
}

export default async function DashboardPage() {
  const metrics = await getMetrics();
  const alerts = await getSystemAlerts();
  const alerts2 = await getSystemAlerts2();
  const external = await getExternalData();
  const user1 = await getUserProfile("user-1");
  const user2 = await getUserProfile("user-2");
  const user3 = await getUserProfile("user-3");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex justify-between items-end pb-6 border-b border-slate-200">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Dashboard
            </h1>
            <p className="text-slate-500 mt-2">
              Demonstrating Next.js Cache Tools with granular invalidation
              strategies.ss
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-slate-500">
              Current Time
            </div>
            <div className="font-mono text-lg">
              {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>

        {JSON.stringify(alerts2)}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card title="Live Metrics (Auto-Refresh)">
            <div className="space-y-4 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">CPU Usage</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-500"
                      style={{ width: `${metrics.cpu}%` }}
                    />
                  </div>
                  <span className="font-mono w-8 text-right">
                    {metrics.cpu}%
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-600">Memory</span>
                <span className="font-mono">{metrics.memory} MB</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-600">Active Users</span>
                <span className="font-mono">{metrics.activeUsers}</span>
              </div>
            </div>
            <div className="mt-4 bg-blue-50 text-blue-700 text-xs p-3 rounded-md">
              ℹ️ configured with <code>expire: 2</code>. It will automatically
              update data every 2 seconds when accessed.
            </div>
            Version: {metrics.version}
            <Timestamp time={metrics.timestamp} />
          </Card>

          <Card title="System Alerts (On-Demand)">
            <div className="flex items-center justify-between mb-6">
              <span className="text-slate-600">Status</span>
              <Badge
                variant={alerts.status === "Healthy" ? "success" : "warning"}
              >
                {alerts.status}
              </Badge>
            </div>

            <p className="text-lg text-slate-800 mb-6 font-medium">
              "{alerts.message}"
            </p>

            <form action={updateAlerts} className="mt-auto">
              <button
                type="submit"
                className="w-full py-2 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-lg transition-colors shadow-sm cursor-pointer"
              >
                Update Alerts
              </button>
            </form>

            <div className="mt-4 bg-slate-100 text-slate-600 text-xs p-3 rounded-md">
              ℹ️ configured with <code>cacheLife("max")</code>. Updates only when
              manually triggered.
            </div>

            <Timestamp time={alerts.timestamp} />
          </Card>

          <Card title="External API (Native Next.js)">
            <div className="space-y-4 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Source</span>
                <span className="font-medium text-slate-900">
                  {external.source}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-600">Version</span>
                <span className="font-mono text-slate-900">
                  {external.version}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-600">Status</span>
                <Badge variant="success">{external.status}</Badge>
              </div>
            </div>

            <form action={updateExternal} className="mt-auto">
              <button
                type="submit"
                className="w-full py-2 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-lg transition-colors shadow-sm cursor-pointer"
              >
                Update External
              </button>
            </form>

            <div className="mt-4 bg-green-50 text-green-700 text-xs p-3 rounded-md">
              ℹ️ Uses native <code>cacheTag()</code> and <code>cacheLife()</code>{" "}
              from Next.js. Also visible in devtools.
            </div>

            <Timestamp time={external.timestamp} />
          </Card>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-800">
              User Management
            </h2>
            <form action={updateAllUsers}>
              <button
                type="submit"
                className="text-sm px-3 py-1.5 bg-slate-800 text-white rounded-md hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Update All Users
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[user1, user2, user3].map((user) => {
              const updateThisUser = updateUser.bind(null, user.id);
              return (
                <Card key={user.id} title={user.name}>
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-sm">Role</span>
                      <span className="font-medium text-slate-800 text-sm">
                        {user.role}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-sm">Last Seen</span>
                      <span className="text-slate-800 text-sm">
                        {new Date(user.lastSeen).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  <form action={updateThisUser}>
                    <button
                      type="submit"
                      className="w-full py-2 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium rounded-lg transition-colors text-sm cursor-pointer"
                    >
                      Update Profile
                    </button>
                  </form>

                  <Timestamp time={user.timestamp} />
                </Card>
              );
            })}
          </div>

          <div className="mt-6 bg-indigo-50/50 border border-indigo-100 p-4 rounded-lg text-sm text-indigo-900">
            <p className="font-medium mb-1">💡 Cache Group Power</p>
            <p>
              Each user card is cached individually by ID. You can update one
              user without affecting others. The "Update All" button uses the
              group tag <code>dashboard.users.profile</code> to invalidate all
              user profiles at once.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
