import type { StatItem } from "./types";
import { COLORS, cn } from "./theme";
import { Sparkline } from "./Sparkline";

export function StatCard({ stat }: { stat: StatItem }) {
  const Icon = stat.icon;
  const color = COLORS[stat.color];
  return (
    <article className={cn("pd-card pd-stat", color.border)}>
      <div className="pd-card-row">
        <div className={cn("pd-icon", color.iconBg, color.iconText)}><Icon size={20} aria-hidden="true" /></div>
        {stat.trend ? <span className={cn("pd-trend", color.text)}>{stat.trend}</span> : null}
      </div>
      <p className="pd-label">{stat.title}</p>
      <div className="pd-stat-value">{stat.value}</div>
      <p className="pd-muted">{stat.subtitle}</p>
      <Sparkline data={stat.sparklineData} className={color.text} />
    </article>
  );
}
