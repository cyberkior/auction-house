"use client";

import { Suspense } from "react";
import Link from "next/link";
import { WalletButton } from "@/components/wallet/WalletButton";
import { BalanceDisplay } from "@/components/wallet/BalanceDisplay";
import { SearchBar } from "@/components/search/SearchBar";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useWallet } from "@solana/wallet-adapter-react";

export function Header() {
  const { connected } = useWallet();

  return (
    <header className="sticky top-0 z-50 glass border-b border-border-subtle">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between py-4">
        {/* Logo & Nav */}
        <div className="flex items-center gap-8">
          <Link href="/" className="group flex items-center gap-3">
            {/* Organic logo mark */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
              </svg>
            </div>
            <span className="font-display text-xl text-text-primary hidden sm:block">
              Auction
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <NavLink href="/">Explore</NavLink>
            {connected && (
              <>
                <NavLink href="/create">Create</NavLink>
                <NavLink href="/profile">Profile</NavLink>
              </>
            )}
          </nav>
        </div>

        {/* Search */}
        <div className="flex-1 max-w-md mx-4 hidden sm:block">
          <Suspense fallback={<div className="h-10 bg-gray-100 rounded-button animate-pulse" />}>
            <SearchBar />
          </Suspense>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          {connected && (
            <>
              <NotificationBell />
              <BalanceDisplay />
            </>
          )}
          <WalletButton />
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-secondary rounded-button transition-all"
    >
      {children}
    </Link>
  );
}
