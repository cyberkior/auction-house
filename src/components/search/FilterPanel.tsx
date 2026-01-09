"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { lamportsToSol, solToLamports } from "@/types";

interface Tag {
  tag: string;
  count: number;
}

interface FilterPanelProps {
  className?: string;
}

export function FilterPanel({ className = "" }: FilterPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [popularTags, setPopularTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState("newest");
  const [isExpanded, setIsExpanded] = useState(false);

  // Load popular tags
  useEffect(() => {
    fetch("/api/tags?limit=10")
      .then((res) => res.json())
      .then((data) => setPopularTags(data.tags || []))
      .catch(console.error);
  }, []);

  // Sync state with URL params
  useEffect(() => {
    const tags = searchParams.get("tags");
    setSelectedTags(tags ? tags.split(",") : []);

    const min = searchParams.get("minPrice");
    setMinPrice(min ? String(lamportsToSol(parseInt(min))) : "");

    const max = searchParams.get("maxPrice");
    setMaxPrice(max ? String(lamportsToSol(parseInt(max))) : "");

    setSort(searchParams.get("sort") || "newest");
  }, [searchParams]);

  const applyFilters = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });

      // Reset pagination when filtering
      params.delete("offset");

      router.push(`/?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handleTagToggle = useCallback(
    (tag: string) => {
      const newTags = selectedTags.includes(tag)
        ? selectedTags.filter((t) => t !== tag)
        : [...selectedTags, tag];

      setSelectedTags(newTags);
      applyFilters({ tags: newTags.length > 0 ? newTags.join(",") : null });
    },
    [selectedTags, applyFilters]
  );

  const handlePriceChange = useCallback(() => {
    applyFilters({
      minPrice: minPrice ? String(solToLamports(parseFloat(minPrice))) : null,
      maxPrice: maxPrice ? String(solToLamports(parseFloat(maxPrice))) : null,
    });
  }, [minPrice, maxPrice, applyFilters]);

  const handleSortChange = useCallback(
    (newSort: string) => {
      setSort(newSort);
      applyFilters({ sort: newSort !== "newest" ? newSort : null });
    },
    [applyFilters]
  );

  const handleClearAll = useCallback(() => {
    setSelectedTags([]);
    setMinPrice("");
    setMaxPrice("");
    setSort("newest");

    const params = new URLSearchParams(searchParams.toString());
    params.delete("tags");
    params.delete("minPrice");
    params.delete("maxPrice");
    params.delete("sort");
    params.delete("offset");

    router.push(`/?${params.toString()}`);
  }, [router, searchParams]);

  const hasActiveFilters =
    selectedTags.length > 0 || minPrice || maxPrice || sort !== "newest";

  return (
    <div className={`bg-white rounded-card border border-gray-200 p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 font-medium text-sm"
        >
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          Filters
          {hasActiveFilters && (
            <span className="bg-accent text-white text-xs px-2 py-0.5 rounded-full">
              Active
            </span>
          )}
        </button>

        {hasActiveFilters && (
          <button
            onClick={handleClearAll}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Filters (expanded) */}
      {isExpanded && (
        <div className="space-y-6">
          {/* Sort */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sort by
            </label>
            <select
              value={sort}
              onChange={(e) => handleSortChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-button text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
            >
              <option value="newest">Newest</option>
              <option value="ending_soon">Ending Soon</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
              <option value="most_bids">Most Bids</option>
            </select>
          </div>

          {/* Tags */}
          {popularTags.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {popularTags.map(({ tag, count }) => (
                  <button
                    key={tag}
                    onClick={() => handleTagToggle(tag)}
                    className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                      selectedTags.includes(tag)
                        ? "bg-accent text-white border-accent"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {tag}
                    <span className="ml-1 opacity-60">({count})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Price Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price Range (SOL)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                onBlur={handlePriceChange}
                placeholder="Min"
                min="0"
                step="0.1"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-button text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
              <span className="text-gray-400">-</span>
              <input
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                onBlur={handlePriceChange}
                placeholder="Max"
                min="0"
                step="0.1"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-button text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>
          </div>
        </div>
      )}

      {/* Quick filters (collapsed) */}
      {!isExpanded && hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-xs"
            >
              {tag}
              <button onClick={() => handleTagToggle(tag)} className="hover:text-red-500">
                &times;
              </button>
            </span>
          ))}
          {(minPrice || maxPrice) && (
            <span className="inline-flex items-center px-2 py-1 bg-gray-100 rounded-full text-xs">
              {minPrice || "0"} - {maxPrice || "∞"} SOL
            </span>
          )}
          {sort !== "newest" && (
            <span className="inline-flex items-center px-2 py-1 bg-gray-100 rounded-full text-xs">
              {sort.replace("_", " ")}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
