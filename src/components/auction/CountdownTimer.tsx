"use client";

import { useEffect, useState } from "react";
import { formatTimeRemaining } from "@/lib/utils/time";

interface CountdownTimerProps {
  endTime: string;
  className?: string;
  onEnd?: () => void;
}

export function CountdownTimer({
  endTime,
  className = "",
  onEnd,
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(formatTimeRemaining(endTime));
  const [isEnded, setIsEnded] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = formatTimeRemaining(endTime);
      setTimeLeft(remaining);

      if (remaining === "Ended" && !isEnded) {
        setIsEnded(true);
        onEnd?.();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [endTime, isEnded, onEnd]);

  // Determine urgency for styling
  const end = new Date(endTime);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  const isUrgent = diff > 0 && diff < 5 * 60 * 1000; // Less than 5 minutes

  return (
    <span
      className={`font-mono ${isUrgent ? "text-red-600" : ""} ${className}`}
    >
      {timeLeft}
    </span>
  );
}
