import { describe, it, expect } from "vitest";
import { lamportsToSol, solToLamports, LAMPORTS_PER_SOL } from "./index";

describe("lamports conversion", () => {
  it("LAMPORTS_PER_SOL is correct", () => {
    expect(LAMPORTS_PER_SOL).toBe(1_000_000_000);
  });

  it("lamportsToSol converts correctly", () => {
    expect(lamportsToSol(1_000_000_000)).toBe(1);
    expect(lamportsToSol(500_000_000)).toBe(0.5);
    expect(lamportsToSol(100_000_000)).toBe(0.1);
    expect(lamportsToSol(0)).toBe(0);
  });

  it("solToLamports converts correctly", () => {
    expect(solToLamports(1)).toBe(1_000_000_000);
    expect(solToLamports(0.5)).toBe(500_000_000);
    expect(solToLamports(0.1)).toBe(100_000_000);
    expect(solToLamports(0)).toBe(0);
  });

  it("conversions are reversible", () => {
    const originalLamports = 123_456_789;
    const sol = lamportsToSol(originalLamports);
    const backToLamports = solToLamports(sol);
    expect(backToLamports).toBe(originalLamports);
  });

  it("solToLamports floors fractional lamports", () => {
    // 0.0000000001 SOL = 0.1 lamports, should floor to 0
    expect(solToLamports(0.0000000001)).toBe(0);
  });
});
