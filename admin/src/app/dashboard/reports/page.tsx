import { redirect } from "next/navigation";
import Link from "next/link";
import { isAuthenticated } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

async function getReports(outcome: string) {
  const supabase = createAdminClient();

  let query = supabase
    .from("reports")
    .select(`
      *,
      reporter:users!reporter_id(wallet_address, username),
      auction:auctions(id, title, image_url, moderation_status)
    `)
    .order("created_at", { ascending: false })
    .limit(100);

  if (outcome !== "all") {
    query = query.eq("outcome", outcome);
  }

  const { data } = await query;
  return data || [];
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { outcome?: string };
}) {
  const authenticated = await isAuthenticated();
  if (!authenticated) redirect("/login");

  const outcome = searchParams.outcome || "pending";
  const reports = await getReports(outcome);

  const filters = [
    { label: "Pending", value: "pending" },
    { label: "Dismissed", value: "dismissed" },
    { label: "Actioned", value: "actioned" },
    { label: "All", value: "all" },
  ];

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/dashboard" className="text-gray-500 hover:text-gray-700">
            &larr; Dashboard
          </Link>
          <h1 className="text-xl font-bold">Reports</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {filters.map((filter) => (
            <Link
              key={filter.value}
              href={`/dashboard/reports?outcome=${filter.value}`}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                outcome === filter.value
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              {filter.label}
            </Link>
          ))}
        </div>

        {/* Reports Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {reports.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              No {outcome} reports
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Auction
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Reporter
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {reports.map((report) => {
                  const auction = report.auction as { id: string; title: string; moderation_status: string } | null;
                  const reporter = report.reporter as { wallet_address: string; username: string | null } | null;

                  return (
                    <tr key={report.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <p className="font-medium">{auction?.title || "Unknown"}</p>
                        <p className="text-xs text-gray-500">
                          {auction?.moderation_status}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded ${getCategoryColor(report.category)}`}>
                          {report.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {reporter?.username || `${reporter?.wallet_address?.slice(0, 8)}...`}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded ${getOutcomeColor(report.outcome)}`}>
                          {report.outcome}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(report.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/dashboard/reports/${report.id}`}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Review
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    nsfw: "bg-pink-100 text-pink-700",
    scam: "bg-red-100 text-red-700",
    stolen: "bg-purple-100 text-purple-700",
    harassment: "bg-orange-100 text-orange-700",
  };
  return colors[category] || "bg-gray-100 text-gray-700";
}

function getOutcomeColor(outcome: string): string {
  const colors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    dismissed: "bg-gray-100 text-gray-700",
    actioned: "bg-green-100 text-green-700",
  };
  return colors[outcome] || "bg-gray-100 text-gray-700";
}
