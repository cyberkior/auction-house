import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuctionStatusBadge } from "./AuctionStatus";

describe("AuctionStatusBadge", () => {
  it("renders upcoming status", () => {
    render(<AuctionStatusBadge status="upcoming" />);
    expect(screen.getByText("Upcoming")).toBeInTheDocument();
  });

  it("renders current/live status with pulse indicator", () => {
    render(<AuctionStatusBadge status="current" />);
    expect(screen.getByText("Live")).toBeInTheDocument();
  });

  it("renders past status", () => {
    render(<AuctionStatusBadge status="past" />);
    expect(screen.getByText("Ended")).toBeInTheDocument();
  });

  it("renders settling status", () => {
    render(<AuctionStatusBadge status="settling" />);
    expect(screen.getByText("Settling")).toBeInTheDocument();
  });

  it("renders completed status", () => {
    render(<AuctionStatusBadge status="completed" />);
    expect(screen.getByText("Sold")).toBeInTheDocument();
  });

  it("renders failed status", () => {
    render(<AuctionStatusBadge status="failed" />);
    expect(screen.getByText("Failed")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(<AuctionStatusBadge status="current" className="custom-class" />);
    const badge = screen.getByText("Live").closest("span");
    expect(badge).toHaveClass("custom-class");
  });
});
