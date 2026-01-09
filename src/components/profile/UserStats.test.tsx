import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { UserStats } from "./UserStats";

describe("UserStats", () => {
  const defaultProps = {
    totalAuctions: 5,
    completedAuctions: 3,
    totalBids: 10,
    wonAuctions: 2,
    credits: 150,
    strikes: 0,
  };

  it("renders all stats", () => {
    render(<UserStats {...defaultProps} />);

    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("Auctions Created")).toBeInTheDocument();

    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Sales")).toBeInTheDocument();

    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("Total Bids")).toBeInTheDocument();

    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Wins")).toBeInTheDocument();

    expect(screen.getByText("150")).toBeInTheDocument();
    expect(screen.getByText("Credits")).toBeInTheDocument();
  });

  it("does not show strikes when zero", () => {
    render(<UserStats {...defaultProps} strikes={0} />);
    expect(screen.queryByText("Strikes")).not.toBeInTheDocument();
  });

  it("shows strikes when greater than zero", () => {
    render(<UserStats {...defaultProps} wonAuctions={0} strikes={2} />);
    expect(screen.getByText("Strikes")).toBeInTheDocument();
    // Use getAllByText since "2" appears in both Wins and Strikes
    expect(screen.getAllByText("2").length).toBeGreaterThanOrEqual(1);
  });

  it("highlights credits stat", () => {
    render(<UserStats {...defaultProps} />);
    const creditsCard = screen.getByText("Credits").closest("div");
    expect(creditsCard).toHaveClass("bg-accent/10");
  });

  it("shows strikes in red", () => {
    render(<UserStats {...defaultProps} strikes={1} />);
    const strikesCard = screen.getByText("Strikes").closest("div");
    expect(strikesCard).toHaveClass("bg-red-50");
  });
});
