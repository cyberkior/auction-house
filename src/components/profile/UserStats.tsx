interface UserStatsProps {
  totalAuctions: number;
  completedAuctions: number;
  totalBids: number;
  wonAuctions: number;
  credits: number;
  strikes: number;
}

export function UserStats({
  totalAuctions,
  completedAuctions,
  totalBids,
  wonAuctions,
  credits,
  strikes,
}: UserStatsProps) {
  const stats = [
    { label: "Auctions Created", value: totalAuctions },
    { label: "Sales", value: completedAuctions },
    { label: "Total Bids", value: totalBids },
    { label: "Wins", value: wonAuctions },
    { label: "Credits", value: credits, highlight: true },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={`p-4 rounded-card ${
            stat.highlight ? "bg-accent/10" : "bg-gray-50"
          }`}
        >
          <p className="text-2xl font-bold">{stat.value}</p>
          <p className="text-sm text-gray-500">{stat.label}</p>
        </div>
      ))}
      {strikes > 0 && (
        <div className="p-4 rounded-card bg-red-50">
          <p className="text-2xl font-bold text-red-600">{strikes}</p>
          <p className="text-sm text-red-600">Strikes</p>
        </div>
      )}
    </div>
  );
}
