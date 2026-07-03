import { cn } from "./theme";

export function Sparkline({ data, className }: { data: number[]; className?: string }) {
  const safe = data.length === 0 ? [0, 0] : data.length === 1 ? [data[0], data[0]] : data;
  const min = Math.min(...safe);
  const max = Math.max(...safe);
  const range = max - min || 1;
  const points = safe.map((value, index) => {
    const x = (index / (safe.length - 1 || 1)) * 100;
    const y = 34 - ((value - min) / range) * 28;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg className={cn("pd-sparkline", className)} viewBox="0 0 100 40" role="img" aria-label="Trend sparkline" preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
    </svg>
  );
}
