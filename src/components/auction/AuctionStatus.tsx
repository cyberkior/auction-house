import type { AuctionStatus as Status } from "@/types";

interface AuctionStatusProps {
  status: Status;
  className?: string;
}

const statusConfig: Record<
  Status,
  { label: string; bgClass: string; textClass: string; dotClass?: string }
> = {
  upcoming: {
    label: "Upcoming",
    bgClass: "bg-bg-elevated/95 backdrop-blur-sm border border-status-upcoming/30",
    textClass: "text-status-upcoming",
  },
  current: {
    label: "Live",
    bgClass: "bg-status-live/15 backdrop-blur-sm border border-status-live/30",
    textClass: "text-status-live",
    dotClass: "bg-status-live",
  },
  past: {
    label: "Ended",
    bgClass: "bg-bg-elevated/95 backdrop-blur-sm border border-border-subtle",
    textClass: "text-text-muted",
  },
  settling: {
    label: "Settling",
    bgClass: "bg-status-settling/15 backdrop-blur-sm border border-status-settling/30",
    textClass: "text-status-settling",
    dotClass: "bg-status-settling",
  },
  completed: {
    label: "Sold",
    bgClass: "bg-status-sold/15 backdrop-blur-sm border border-status-sold/30",
    textClass: "text-status-sold",
  },
  failed: {
    label: "Failed",
    bgClass: "bg-status-failed/15 backdrop-blur-sm border border-status-failed/30",
    textClass: "text-status-failed",
  },
};

export function AuctionStatusBadge({ status, className = "" }: AuctionStatusProps) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-button text-xs font-semibold uppercase tracking-wider shadow-sm ${config.bgClass} ${config.textClass} ${className}`}
    >
      {config.dotClass && (
        <span className={`w-2 h-2 rounded-full ${config.dotClass} animate-pulse-glow`} />
      )}
      {config.label}
    </span>
  );
}
