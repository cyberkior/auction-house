"use client";

import { useEffect, useState, useRef } from "react";
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
  // Initialize with empty string to avoid hydration mismatch (server/client time differs)
  const [timeLeft, setTimeLeft] = useState("");
  const [isEnded, setIsEnded] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);
  const hasEndedRef = useRef(false);

  useEffect(() => {
    // Set initial value on client
    setTimeLeft(formatTimeRemaining(endTime));
    hasEndedRef.current = false; // Reset when endTime changes

    const timer = setInterval(() => {
      const remaining = formatTimeRemaining(endTime);
      setTimeLeft(remaining);

      // Check urgency
      const end = new Date(endTime);
      const now = new Date();
      const diff = end.getTime() - now.getTime();
      setIsUrgent(diff > 0 && diff < 5 * 60 * 1000);

      if (remaining === "Ended" && !hasEndedRef.current) {
        hasEndedRef.current = true;
        setIsEnded(true);
        onEnd?.();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [endTime, onEnd]);

  return (
    <span
      className={`font-mono ${isUrgent ? "text-red-600" : ""} ${className}`}
    >
      {timeLeft || "--:--"}
    </span>
  );
}
