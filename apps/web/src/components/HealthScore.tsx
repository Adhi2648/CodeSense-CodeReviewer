interface HealthScoreProps {
  score: number;
}

export const HealthScore = ({ score }: HealthScoreProps): JSX.Element => {
  const safeScore = Math.max(0, Math.min(100, score));
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (safeScore / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-6">
      <svg width="120" height="120" className="animate-pulse-score">
        <circle cx="60" cy="60" r={radius} stroke="#e5e7eb" strokeWidth="10" fill="transparent" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          stroke={safeScore >= 70 ? "#22c55e" : safeScore >= 40 ? "#f59e0b" : "#ef4444"}
          strokeWidth="10"
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform="rotate(-90 60 60)"
        />
      </svg>
      <div className="-mt-16 text-center">
        <div className="text-3xl font-bold">{Math.round(safeScore)}</div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Health Score</div>
      </div>
    </div>
  );
};
