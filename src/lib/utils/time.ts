export function formatTimeRemaining(endTime: string | Date): string {
  const end = new Date(endTime);
  const now = new Date();
  const diff = end.getTime() - now.getTime();

  if (diff <= 0) return "Ended";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function isUpcoming(startTime: string | Date): boolean {
  return new Date(startTime) > new Date();
}

export function isCurrent(startTime: string | Date, endTime: string | Date): boolean {
  const now = new Date();
  return new Date(startTime) <= now && new Date(endTime) > now;
}

export function isPast(endTime: string | Date): boolean {
  return new Date(endTime) <= new Date();
}

export function getAuctionTimeStatus(
  startTime: string | Date,
  endTime: string | Date
): "upcoming" | "current" | "ended" {
  if (isUpcoming(startTime)) return "upcoming";
  if (isCurrent(startTime, endTime)) return "current";
  return "ended";
}
