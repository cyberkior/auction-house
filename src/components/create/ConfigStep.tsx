"use client";

import { useState, useMemo } from "react";
import { solToLamports, lamportsToSol } from "@/types";

interface ConfigStepProps {
  reservePrice: number;
  minBidIncrement: number;
  startTime: string;
  endTime: string;
  onReservePriceChange: (price: number) => void;
  onMinBidIncrementChange: (increment: number) => void;
  onStartTimeChange: (time: string) => void;
  onEndTimeChange: (time: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export function ConfigStep({
  reservePrice,
  minBidIncrement,
  startTime,
  endTime,
  onReservePriceChange,
  onMinBidIncrementChange,
  onStartTimeChange,
  onEndTimeChange,
  onBack,
  onSubmit,
  isSubmitting,
}: ConfigStepProps) {
  const [reserveSol, setReserveSol] = useState(
    reservePrice > 0 ? lamportsToSol(reservePrice).toString() : ""
  );
  const [incrementSol, setIncrementSol] = useState(
    minBidIncrement > 0 ? lamportsToSol(minBidIncrement).toString() : "0.1"
  );

  // Get minimum datetime (now + 5 minutes)
  const minDateTime = useMemo(() => {
    const date = new Date();
    date.setMinutes(date.getMinutes() + 5);
    return date.toISOString().slice(0, 16);
  }, []);

  const handleReserveChange = (value: string) => {
    setReserveSol(value);
    const sol = parseFloat(value);
    if (!isNaN(sol) && sol >= 0) {
      onReservePriceChange(solToLamports(sol));
    } else {
      onReservePriceChange(0);
    }
  };

  const handleIncrementChange = (value: string) => {
    setIncrementSol(value);
    const sol = parseFloat(value);
    if (!isNaN(sol) && sol > 0) {
      onMinBidIncrementChange(solToLamports(sol));
    }
  };

  const isValid = useMemo(() => {
    if (!startTime || !endTime) return false;
    const start = new Date(startTime);
    const end = new Date(endTime);
    const now = new Date();

    // Start must be in the future
    if (start <= now) return false;
    // End must be after start
    if (end <= start) return false;
    // Minimum 1 hour auction
    if (end.getTime() - start.getTime() < 60 * 60 * 1000) return false;
    // Min increment must be positive
    if (minBidIncrement <= 0) return false;

    return true;
  }, [startTime, endTime, minBidIncrement]);

  return (
    <div className="space-y-8">
      {/* Reserve Price */}
      <div>
        <label
          htmlFor="reserve"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Reserve Price (optional)
        </label>
        <div className="relative">
          <input
            type="number"
            id="reserve"
            value={reserveSol}
            onChange={(e) => handleReserveChange(e.target.value)}
            placeholder="0"
            min="0"
            step="0.1"
            className="w-full px-4 py-3 pr-16 border border-gray-200 rounded-card focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
            SOL
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Minimum starting price. Leave empty for no reserve.
        </p>
      </div>

      {/* Min Bid Increment */}
      <div>
        <label
          htmlFor="increment"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Minimum Bid Increment
        </label>
        <div className="relative">
          <input
            type="number"
            id="increment"
            value={incrementSol}
            onChange={(e) => handleIncrementChange(e.target.value)}
            placeholder="0.1"
            min="0.001"
            step="0.01"
            className="w-full px-4 py-3 pr-16 border border-gray-200 rounded-card focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
            SOL
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Each new bid must be at least this much higher.
        </p>
      </div>

      {/* Start Time */}
      <div>
        <label
          htmlFor="start"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Start Time
        </label>
        <input
          type="datetime-local"
          id="start"
          value={startTime}
          onChange={(e) => onStartTimeChange(e.target.value)}
          min={minDateTime}
          className="w-full px-4 py-3 border border-gray-200 rounded-card focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
        />
      </div>

      {/* End Time */}
      <div>
        <label
          htmlFor="end"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          End Time
        </label>
        <input
          type="datetime-local"
          id="end"
          value={endTime}
          onChange={(e) => onEndTimeChange(e.target.value)}
          min={startTime || minDateTime}
          className="w-full px-4 py-3 border border-gray-200 rounded-card focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
        />
        <p className="text-xs text-gray-400 mt-1">
          Minimum auction duration is 1 hour.
        </p>
      </div>

      {/* Summary */}
      <div className="bg-gray-50 rounded-card p-6">
        <h3 className="font-medium mb-4">Auction Summary</h3>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-500">Reserve Price</dt>
            <dd>{reservePrice > 0 ? `${lamportsToSol(reservePrice)} SOL` : "No reserve"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Min Increment</dt>
            <dd>{lamportsToSol(minBidIncrement)} SOL</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Platform Fee</dt>
            <dd>10% on sale</dd>
          </div>
        </dl>
      </div>

      {/* Buttons */}
      <div className="flex gap-4 pt-4">
        <button
          onClick={onBack}
          disabled={isSubmitting}
          className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-button font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          Back
        </button>
        <button
          onClick={onSubmit}
          disabled={!isValid || isSubmitting}
          className="flex-1 py-3 bg-accent text-white rounded-button font-medium hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Creating..." : "Create Auction"}
        </button>
      </div>
    </div>
  );
}
