"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

interface Report {
  id: string;
  category: string;
  description: string;
  outcome: string;
  created_at: string;
  reporter: {
    id: string;
    wallet_address: string;
    username: string | null;
    strikes: number;
  };
  auction: {
    id: string;
    title: string;
    description: string;
    image_url: string;
    moderation_status: string;
    creator: {
      id: string;
      wallet_address: string;
      username: string | null;
      strikes: number;
      is_restricted: boolean;
    };
  };
}

export default function ReportDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [report, setReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActioning, setIsActioning] = useState(false);

  useEffect(() => {
    fetch(`/api/reports/${params.id}`)
      .then((res) => res.json())
      .then((data) => setReport(data.report))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [params.id]);

  const handleAction = async (
    outcome: "dismissed" | "actioned",
    options?: { strikeUser?: boolean; removeAuction?: boolean }
  ) => {
    setIsActioning(true);

    try {
      const res = await fetch(`/api/reports/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outcome,
          strikeUser: options?.strikeUser,
          removeAuction: options?.removeAuction,
        }),
      });

      if (res.ok) {
        router.push("/dashboard/reports");
      }
    } catch (error) {
      console.error("Failed to action report:", error);
    } finally {
      setIsActioning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Report not found</p>
      </div>
    );
  }

  const isPending = report.outcome === "pending";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/dashboard/reports" className="text-gray-500 hover:text-gray-700">
            &larr; Reports
          </Link>
          <h1 className="text-xl font-bold">Report Details</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Report Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Report Information</h2>

            <dl className="space-y-4">
              <div>
                <dt className="text-sm text-gray-500">Category</dt>
                <dd className="font-medium capitalize">{report.category}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Description</dt>
                <dd className="text-gray-900">{report.description}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Status</dt>
                <dd>
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      report.outcome === "pending"
                        ? "bg-yellow-100 text-yellow-700"
                        : report.outcome === "actioned"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {report.outcome}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Reported At</dt>
                <dd className="text-gray-900">
                  {new Date(report.created_at).toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Reporter</dt>
                <dd className="text-gray-900">
                  {report.reporter.username ||
                    `${report.reporter.wallet_address.slice(0, 8)}...`}
                  {report.reporter.strikes > 0 && (
                    <span className="ml-2 text-xs text-orange-600">
                      ({report.reporter.strikes} strikes)
                    </span>
                  )}
                </dd>
              </div>
            </dl>
          </div>

          {/* Auction Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Reported Auction</h2>

            {report.auction.image_url && (
              <div className="relative aspect-video mb-4 bg-gray-100 rounded-lg overflow-hidden">
                <Image
                  src={report.auction.image_url}
                  alt={report.auction.title}
                  fill
                  className="object-cover"
                />
              </div>
            )}

            <dl className="space-y-4">
              <div>
                <dt className="text-sm text-gray-500">Title</dt>
                <dd className="font-medium">{report.auction.title}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Description</dt>
                <dd className="text-gray-900 text-sm">
                  {report.auction.description.slice(0, 200)}
                  {report.auction.description.length > 200 && "..."}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Moderation Status</dt>
                <dd>
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      report.auction.moderation_status === "removed"
                        ? "bg-red-100 text-red-700"
                        : report.auction.moderation_status === "flagged"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {report.auction.moderation_status}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Creator</dt>
                <dd className="text-gray-900">
                  {report.auction.creator.username ||
                    `${report.auction.creator.wallet_address.slice(0, 8)}...`}
                  {report.auction.creator.strikes > 0 && (
                    <span className="ml-2 text-xs text-orange-600">
                      ({report.auction.creator.strikes} strikes)
                    </span>
                  )}
                  {report.auction.creator.is_restricted && (
                    <span className="ml-2 text-xs text-red-600">(Restricted)</span>
                  )}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Actions */}
        {isPending && (
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Take Action</h2>

            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => handleAction("dismissed")}
                disabled={isActioning}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
              >
                Dismiss Report
              </button>

              <button
                onClick={() => handleAction("actioned", { removeAuction: true })}
                disabled={isActioning}
                className="px-6 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50"
              >
                Remove Auction
              </button>

              <button
                onClick={() =>
                  handleAction("actioned", { removeAuction: true, strikeUser: true })
                }
                disabled={isActioning}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Remove & Strike Creator
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
