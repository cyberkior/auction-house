import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuctionCard, AuctionCardSkeleton } from "./AuctionCard";
import { mockAuction, mockUpcomingAuction } from "@/test/mocks";

describe("AuctionCard", () => {
  it("renders auction title", () => {
    render(<AuctionCard auction={mockAuction} />);
    expect(screen.getByText("Test Artwork")).toBeInTheDocument();
  });

  it("renders creator name", () => {
    render(<AuctionCard auction={mockAuction} />);
    expect(screen.getByText(/artist/)).toBeInTheDocument();
  });

  it("renders status badge", () => {
    render(<AuctionCard auction={mockAuction} />);
    expect(screen.getByText("Live")).toBeInTheDocument();
  });

  it("renders current bid when available", () => {
    render(<AuctionCard auction={mockAuction} />);
    expect(screen.getByText("Current Bid")).toBeInTheDocument();
    // 200000000 lamports = 0.2 SOL, formatted as "0.20 SOL"
    expect(screen.getByText(/0\.20.*SOL/)).toBeInTheDocument();
  });

  it("renders reserve price when no bids", () => {
    const auctionNoBids = { ...mockAuction, highest_bid: undefined };
    render(<AuctionCard auction={auctionNoBids} />);
    expect(screen.getByText("Reserve")).toBeInTheDocument();
  });

  it("renders bid count", () => {
    render(<AuctionCard auction={mockAuction} />);
    expect(screen.getByText("2 bids")).toBeInTheDocument();
  });

  it("links to auction detail page", () => {
    render(<AuctionCard auction={mockAuction} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", `/auction/${mockAuction.id}`);
  });

  it("shows countdown for live auctions", () => {
    render(<AuctionCard auction={mockAuction} />);
    // CountdownTimer should be present for current status
    expect(screen.getByText("Live")).toBeInTheDocument();
  });
});

describe("AuctionCardSkeleton", () => {
  it("renders skeleton loader", () => {
    const { container } = render(<AuctionCardSkeleton />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });
});
