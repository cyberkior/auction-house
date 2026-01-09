import { redirect } from "next/navigation";
import Link from "next/link";
import { isAuthenticated } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

async function getStats() {
  const supabase = createAdminClient();

  const [
    { count: pendingReports },
    { count: flaggedAuctions },
    { count: restrictedUsers },
    { count: totalUsers },
  ] = await Promise.all([
    supabase
      .from("reports")
      .select("*", { count: "exact", head: true })
      .eq("outcome", "pending"),
    supabase
      .from("auctions")
      .select("*", { count: "exact", head: true })
      .eq("moderation_status", "flagged"),
    supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("is_restricted", true),
    supabase
      .from("users")
      .select("*", { count: "exact", head: true }),
  ]);

  return {
    pendingReports: pendingReports || 0,
    flaggedAuctions: flaggedAuctions || 0,
    restrictedUsers: restrictedUsers || 0,
    totalUsers: totalUsers || 0,
  };
}

async function getRecentReports() {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("reports")
    .select(`
      *,
      reporter:users!reporter_id(wallet_address, username),
      auction:auctions(id, title, image_url)
    `)
    .eq("outcome", "pending")
    .order("created_at", { ascending: false })
    .limit(10);

  return data || [];
}

export default async function DashboardPage() {
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    redirect("/login");
  }

  const [stats, recentReports] = await Promise.all([
    getStats(),
    getRecentReports(),
  ]);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Auction House Admin</h1>
          <form action="/api/auth" method="DELETE">
            <button
              type="submit"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Logout
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard
            label="Pending Reports"
            value={stats.pendingReports}
            color="red"
            href="/dashboard/reports"
          />
          <StatCard
            label="Flagged Auctions"
            value={stats.flaggedAuctions}
            color="yellow"
            href="/dashboard/auctions"
          />
          <StatCard
            label="Restricted Users"
            value={stats.restrictedUsers}
            color="gray"
            href="/dashboard/users"
          />
          <StatCard
            label="Total Users"
            value={stats.totalUsers}
            color="blue"
          />
        </div>

        {/* Recent Reports */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Reports</h2>
            <Link
              href="/dashboard/reports"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              View all
            </Link>
          </div>

          {recentReports.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              No pending reports
            </div>
          ) : (
            <div className="divide-y">
              {recentReports.map((report) => (
                <ReportRow key={report.id} report={report} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  href,
}: {
  label: string;
  value: number;
  color: "red" | "yellow" | "gray" | "blue";
  href?: string;
}) {
  const colorClasses = {
    red: "bg-red-50 text-red-600 border-red-100",
    yellow: "bg-yellow-50 text-yellow-600 border-yellow-100",
    gray: "bg-gray-50 text-gray-600 border-gray-100",
    blue: "bg-blue-50 text-blue-600 border-blue-100",
  };

  const content = (
    <div className={`rounded-lg border p-6 ${colorClasses[color]}`}>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm mt-1 opacity-80">{label}</p>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block hover:opacity-80 transition-opacity">
        {content}
      </Link>
    );
  }

  return content;
}

function ReportRow({ report }: { report: Record<string, unknown> }) {
  const auction = report.auction as { id: string; title: string } | null;
  const reporter = report.reporter as { wallet_address: string; username: string | null } | null;

  return (
    <div className="px-6 py-4 flex items-center justify-between">
      <div>
        <p className="font-medium">{auction?.title || "Unknown Auction"}</p>
        <p className="text-sm text-gray-500">
          {report.category as string} - Reported by{" "}
          {reporter?.username || (reporter?.wallet_address as string)?.slice(0, 8)}...
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">
          {report.category as string}
        </span>
        <Link
          href={`/dashboard/reports/${report.id}`}
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
        >
          Review
        </Link>
      </div>
    </div>
  );
}
