"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AuctionCard, AuctionCardSkeleton } from "@/components/auction/AuctionCard";
import { FilterPanel } from "@/components/search/FilterPanel";
import { useAuctions } from "@/hooks/useAuctions";

type TabStatus = "current" | "upcoming" | "past";

const tabs: { label: string; status: TabStatus }[] = [
  { label: "Live", status: "current" },
  { label: "Upcoming", status: "upcoming" },
  { label: "Past", status: "past" },
];

function HomeContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabStatus>("current");

  // Get search/filter params from URL
  const query = searchParams.get("q") || undefined;
  const urlTags = searchParams.get("tags") || undefined;
  const minPrice = searchParams.get("minPrice") || undefined;
  const maxPrice = searchParams.get("maxPrice") || undefined;
  const sort = searchParams.get("sort") || undefined;

  const hasSearchFilters = !!(query || urlTags || minPrice || maxPrice);

  // Trending auctions (live + upcoming) - only show when no search filters
  const {
    auctions: trendingAuctions,
    isLoading: trendingLoading,
  } = useAuctions({ trending: true, limit: 8 });

  // Explore auctions based on active tab and search filters
  const {
    auctions: exploreAuctions,
    isLoading: exploreLoading,
    hasMore,
    loadMore,
  } = useAuctions({
    status: hasSearchFilters ? undefined : activeTab,
    limit: 12,
    query,
    tags: urlTags,
    minPrice,
    maxPrice,
    sort,
  });

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Organic background shapes */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -left-20 w-80 h-80 bg-accent/8 blob blur-3xl" />
          <div className="absolute top-40 right-10 w-64 h-64 bg-olive/10 blob blur-2xl" />
          <div className="absolute bottom-0 left-1/3 w-96 h-48 bg-accent/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 pt-24 pb-20">
          <div className="max-w-3xl animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-olive-muted rounded-full mb-6">
              <span className="w-2 h-2 bg-olive rounded-full" />
              <span className="text-olive text-sm font-medium">Digital Art Marketplace</span>
            </div>

            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl text-text-primary leading-[1.1] mb-8">
              Curated Art for{" "}
              <span className="text-gradient">Discerning</span>{" "}
              Collectors
            </h1>

            <p className="text-xl text-text-secondary max-w-xl leading-relaxed mb-10">
              Discover and bid on extraordinary digital artwork from emerging and established creators.
              Your next masterpiece awaits.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4">
              <button className="px-8 py-4 bg-accent text-white font-semibold rounded-button hover:bg-accent-hover transition-all hover:-translate-y-0.5 hover:shadow-lg">
                Explore Auctions
              </button>
              <button className="px-8 py-4 bg-bg-elevated text-text-primary font-semibold rounded-button border border-border-default hover:border-accent hover:bg-accent-muted transition-all">
                Learn More
              </button>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap gap-16 mt-20 pt-10 border-t border-border-subtle">
            <Stat label="Live Auctions" value="24" accent />
            <Stat label="Total Volume" value="1.2K" suffix="SOL" />
            <Stat label="Artists" value="156" />
            <Stat label="Collectors" value="890" />
          </div>
        </div>
      </section>

      {/* Trending Section */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="flex items-end justify-between mb-10">
          <div>
            <span className="text-accent text-sm font-semibold uppercase tracking-wider">Featured</span>
            <h2 className="font-display text-4xl text-text-primary mt-2">Trending Now</h2>
          </div>
          <button className="text-sm text-text-secondary hover:text-accent transition-colors font-medium flex items-center gap-2 group">
            View all
            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </button>
        </div>

        <div className="flex gap-6 overflow-x-auto pb-4 -mx-6 px-6 scrollbar-hide stagger-children">
          {trendingLoading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="flex-shrink-0 w-72">
                <AuctionCardSkeleton />
              </div>
            ))
          ) : trendingAuctions.length > 0 ? (
            trendingAuctions.map((auction) => (
              <div key={auction.id} className="flex-shrink-0 w-72">
                <AuctionCard auction={auction} />
              </div>
            ))
          ) : (
            <div className="w-full py-20 text-center">
              <div className="w-20 h-20 rounded-2xl bg-bg-secondary mx-auto mb-6 flex items-center justify-center">
                <svg className="w-10 h-10 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-text-secondary text-lg mb-2">No trending auctions</p>
              <p className="text-text-muted">Check back soon for new drops</p>
            </div>
          )}
        </div>
      </section>

      {/* Explore Section */}
      <section className="bg-bg-secondary py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-6">
            <div>
              <span className="text-olive text-sm font-semibold uppercase tracking-wider">
                {hasSearchFilters ? "Search Results" : "Browse"}
              </span>
              <h2 className="font-display text-4xl text-text-primary mt-2">
                {query ? `"${query}"` : hasSearchFilters ? "Filtered Results" : "Explore Collection"}
              </h2>
              {hasSearchFilters && exploreAuctions.length > 0 && (
                <p className="text-text-muted mt-2">{exploreAuctions.length} results found</p>
              )}
            </div>

            {/* Tab Pills - only show when not searching */}
            {!hasSearchFilters && (
              <div className="flex gap-1 p-1.5 bg-bg-elevated rounded-button shadow-sm border border-border-subtle">
                {tabs.map((tab) => (
                  <button
                    key={tab.status}
                    onClick={() => setActiveTab(tab.status)}
                    className={`px-6 py-2.5 text-sm font-semibold rounded-button transition-all duration-200 ${
                      activeTab === tab.status
                        ? "bg-accent text-white shadow-md"
                        : "text-text-secondary hover:text-text-primary hover:bg-bg-secondary"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Filter Panel */}
          <div className="mb-8">
            <Suspense fallback={<div className="h-14 bg-white rounded-card animate-pulse" />}>
              <FilterPanel />
            </Suspense>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 stagger-children">
            {exploreLoading && exploreAuctions.length === 0 ? (
              [...Array(8)].map((_, i) => <AuctionCardSkeleton key={i} />)
            ) : exploreAuctions.length > 0 ? (
              exploreAuctions.map((auction) => (
                <AuctionCard key={auction.id} auction={auction} />
              ))
            ) : (
              <div className="col-span-full py-24 text-center">
                <div className="w-24 h-24 rounded-2xl bg-bg-elevated mx-auto mb-8 flex items-center justify-center border border-border-subtle">
                  <svg className="w-12 h-12 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <p className="text-text-primary text-xl font-display mb-3">
                  {hasSearchFilters ? "No matching auctions" : `No ${activeTab} auctions`}
                </p>
                <p className="text-text-muted">
                  {hasSearchFilters ? "Try adjusting your search or filters" : "Check back later or try a different filter"}
                </p>
              </div>
            )}
          </div>

          {/* Load More */}
          {hasMore && exploreAuctions.length > 0 && (
            <div className="mt-16 text-center">
              <button
                onClick={loadMore}
                disabled={exploreLoading}
                className="group px-10 py-4 bg-bg-elevated text-text-primary rounded-button font-semibold border border-border-default hover:border-accent hover:bg-accent-muted transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {exploreLoading ? (
                  <span className="flex items-center gap-3">
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Loading...
                  </span>
                ) : (
                  <span className="flex items-center gap-3">
                    Load More
                    <svg className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, suffix, accent }: { label: string; value: string; suffix?: string; accent?: boolean }) {
  return (
    <div>
      <p className={`text-4xl font-display mb-2 ${accent ? "text-accent" : "text-text-primary"}`}>
        {value}
        {suffix && <span className="text-xl text-text-muted ml-1">{suffix}</span>}
      </p>
      <p className="text-sm text-text-muted font-medium">{label}</p>
    </div>
  );
}

// Default export with Suspense for useSearchParams
export default function Home() {
  return (
    <Suspense fallback={<HomeLoading />}>
      <HomeContent />
    </Suspense>
  );
}

function HomeLoading() {
  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-24">
        <div className="animate-pulse space-y-8">
          <div className="h-12 bg-gray-200 rounded w-1/3" />
          <div className="h-6 bg-gray-200 rounded w-1/2" />
          <div className="grid grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-card" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
