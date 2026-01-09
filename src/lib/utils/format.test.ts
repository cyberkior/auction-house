import { describe, it, expect } from "vitest";
import { formatSol, formatWalletAddress, formatNumber } from "./format";

describe("formatSol", () => {
  it("formats large amounts with K suffix", () => {
    expect(formatSol(1000 * 1e9)).toBe("1.0K SOL");
    expect(formatSol(2500 * 1e9)).toBe("2.5K SOL");
  });

  it("formats regular amounts with 2 decimals", () => {
    expect(formatSol(1 * 1e9)).toBe("1.00 SOL");
    expect(formatSol(10.5 * 1e9)).toBe("10.50 SOL");
    expect(formatSol(100.25 * 1e9)).toBe("100.25 SOL");
  });

  it("formats small amounts with 4 decimals", () => {
    expect(formatSol(0.1 * 1e9)).toBe("0.1000 SOL");
    expect(formatSol(0.01 * 1e9)).toBe("0.0100 SOL");
  });

  it("formats very small amounts with 6 decimals", () => {
    expect(formatSol(0.001 * 1e9)).toBe("0.001000 SOL");
    expect(formatSol(0.000001 * 1e9)).toBe("0.000001 SOL");
  });

  it("handles zero", () => {
    expect(formatSol(0)).toBe("0.000000 SOL");
  });
});

describe("formatWalletAddress", () => {
  it("truncates long addresses", () => {
    const address = "7nYmDMGTsQpfh8HqpLUJvE9oVPh3LnJbqKWPnk4JJvZB";
    expect(formatWalletAddress(address)).toBe("7nYm...JvZB");
  });

  it("returns short addresses as-is", () => {
    expect(formatWalletAddress("short")).toBe("short");
    expect(formatWalletAddress("123456789012")).toBe("123456789012");
  });

  it("handles empty string", () => {
    expect(formatWalletAddress("")).toBe("");
  });
});

describe("formatNumber", () => {
  it("formats numbers with thousand separators", () => {
    expect(formatNumber(1000)).toBe("1,000");
    expect(formatNumber(1000000)).toBe("1,000,000");
  });

  it("handles small numbers", () => {
    expect(formatNumber(1)).toBe("1");
    expect(formatNumber(100)).toBe("100");
  });
});
