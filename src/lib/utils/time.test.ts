import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  formatTimeRemaining,
  formatDate,
  isUpcoming,
  isCurrent,
  isPast,
  getAuctionTimeStatus,
} from "./time";

describe("formatTimeRemaining", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows days and hours for long durations", () => {
    const endTime = new Date("2024-01-17T14:00:00Z").toISOString();
    expect(formatTimeRemaining(endTime)).toBe("2d 2h");
  });

  it("shows hours and minutes for medium durations", () => {
    const endTime = new Date("2024-01-15T15:30:00Z").toISOString();
    expect(formatTimeRemaining(endTime)).toBe("3h 30m");
  });

  it("shows minutes and seconds for short durations", () => {
    const endTime = new Date("2024-01-15T12:05:30Z").toISOString();
    expect(formatTimeRemaining(endTime)).toBe("5m 30s");
  });

  it("shows seconds only for very short durations", () => {
    const endTime = new Date("2024-01-15T12:00:45Z").toISOString();
    expect(formatTimeRemaining(endTime)).toBe("45s");
  });

  it("returns Ended for past times", () => {
    const endTime = new Date("2024-01-15T11:00:00Z").toISOString();
    expect(formatTimeRemaining(endTime)).toBe("Ended");
  });
});

describe("formatDate", () => {
  it("formats date correctly", () => {
    const date = "2024-01-15T14:30:00Z";
    const formatted = formatDate(date);
    expect(formatted).toContain("Jan");
    expect(formatted).toContain("15");
    expect(formatted).toContain("2024");
  });
});

describe("time status helpers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("isUpcoming returns true for future start times", () => {
    expect(isUpcoming("2024-01-15T13:00:00Z")).toBe(true);
    expect(isUpcoming("2024-01-15T11:00:00Z")).toBe(false);
  });

  it("isPast returns true for past end times", () => {
    expect(isPast("2024-01-15T11:00:00Z")).toBe(true);
    expect(isPast("2024-01-15T13:00:00Z")).toBe(false);
  });

  it("isCurrent returns true when now is between start and end", () => {
    expect(isCurrent("2024-01-15T11:00:00Z", "2024-01-15T13:00:00Z")).toBe(
      true
    );
    expect(isCurrent("2024-01-15T13:00:00Z", "2024-01-15T14:00:00Z")).toBe(
      false
    );
  });

  it("getAuctionTimeStatus returns correct status", () => {
    expect(
      getAuctionTimeStatus("2024-01-15T13:00:00Z", "2024-01-15T14:00:00Z")
    ).toBe("upcoming");
    expect(
      getAuctionTimeStatus("2024-01-15T11:00:00Z", "2024-01-15T13:00:00Z")
    ).toBe("current");
    expect(
      getAuctionTimeStatus("2024-01-15T10:00:00Z", "2024-01-15T11:00:00Z")
    ).toBe("ended");
  });
});
