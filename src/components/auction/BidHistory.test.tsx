import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BidHistory } from "./BidHistory";
import { mockBid, mockUser } from "@/test/mocks";
import type { Bid } from "@/types";

describe("BidHistory", () => {
  it("shows empty message when no bids", () => {
    render(<BidHistory bids={[]} />);
    expect(screen.getByText(/No bids yet/)).toBeInTheDocument();
  });

  it("renders bids sorted by amount descending", () => {
    const bids: Bid[] = [
      { ...mockBid, id: "1", amount: 100000000 },
      { ...mockBid, id: "2", amount: 300000000 },
      { ...mockBid, id: "3", amount: 200000000 },
    ];

    render(<BidHistory bids={bids} />);

    // Verify all three amounts are present (formatSol uses 4 decimals for amounts 0.01-1 SOL)
    expect(screen.getByText("0.3000 SOL")).toBeInTheDocument();
    expect(screen.getByText("0.2000 SOL")).toBeInTheDocument();
    expect(screen.getByText("0.1000 SOL")).toBeInTheDocument();
  });

  it("highlights top 3 bids", () => {
    const bids: Bid[] = [
      { ...mockBid, id: "1", amount: 100000000 },
      { ...mockBid, id: "2", amount: 200000000 },
      { ...mockBid, id: "3", amount: 300000000 },
    ];

    render(<BidHistory bids={bids} />);

    expect(screen.getAllByText("Top 3")).toHaveLength(3);
  });

  it("shows rank badges", () => {
    const bids: Bid[] = [
      { ...mockBid, id: "1", amount: 100000000 },
      { ...mockBid, id: "2", amount: 200000000 },
    ];

    render(<BidHistory bids={bids} />);

    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("highlights current user's bid", () => {
    const currentUserWallet = mockUser.wallet_address;

    render(
      <BidHistory bids={[mockBid]} currentUserWallet={currentUserWallet} />
    );

    expect(screen.getByText("(You)")).toBeInTheDocument();
  });

  it("shows bidder username or truncated address", () => {
    render(<BidHistory bids={[mockBid]} />);
    expect(screen.getByText("testuser")).toBeInTheDocument();
  });
});
