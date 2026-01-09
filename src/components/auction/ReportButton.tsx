"use client";

import { useState } from "react";
import type { ReportCategory } from "@/types";

interface ReportButtonProps {
  auctionId: string;
  walletAddress: string | null;
  isAuthenticated: boolean;
}

const categories: { value: ReportCategory; label: string }[] = [
  { value: "nsfw", label: "NSFW Content" },
  { value: "scam", label: "Scam / Fraud" },
  { value: "stolen", label: "Stolen Content" },
  { value: "harassment", label: "Harassment" },
];

export function ReportButton({
  auctionId,
  walletAddress,
  isAuthenticated,
}: ReportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState<ReportCategory | "">("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!category || !walletAddress) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress,
          auctionId,
          category,
          description,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit report");
      }

      setSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(false);
        setCategory("");
        setDescription("");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
      >
        Report
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal */}
          <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-card border border-gray-200 shadow-lg p-4 z-50">
            {success ? (
              <div className="text-center py-4">
                <div className="text-2xl mb-2">✓</div>
                <p className="text-green-600 font-medium">Report submitted</p>
              </div>
            ) : (
              <>
                <h3 className="font-semibold mb-3">Report Auction</h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Reason
                    </label>
                    <select
                      value={category}
                      onChange={(e) =>
                        setCategory(e.target.value as ReportCategory)
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                    >
                      <option value="">Select a reason</option>
                      {categories.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Details (optional)
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Provide additional details..."
                      rows={3}
                      maxLength={500}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none"
                    />
                  </div>

                  {error && (
                    <p className="text-sm text-red-600">{error}</p>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsOpen(false)}
                      className="flex-1 px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={!category || isSubmitting}
                      className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? "..." : "Submit"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
