import { MoreHorizontal, RefreshCw } from "lucide-react";
import type { ProfileSnapshot } from "./types";

function ConfidenceRing({ value, label }: { value: number; label: string }) {
  const safeValue = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - safeValue / 100);

  return (
    <div className="pd-ring">
      <svg viewBox="0 0 100 100" aria-label={`Profile confidence ${label}`}>
        <circle cx="50" cy="50" r={radius} className="pd-ring-bg" />
        <circle cx="50" cy="50" r={radius} className="pd-ring-fg" strokeDasharray={circumference} strokeDashoffset={offset} />
      </svg>
      <strong>{label}</strong>
    </div>
  );
}

export function AdaptiveProfileCard({ profile, loading = false }: { profile: ProfileSnapshot; loading?: boolean }) {
  return (
    <section className="pd-card">
      <div className="pd-section-head">
        <div><p className="pd-label">Adaptive Profile</p><h3>{profile.name}</h3></div>
        <span className="pd-pill pd-pill-slate">{profile.status}</span>
      </div>
      {loading ? <div className="pd-loading" aria-label="Loading adaptive profile shell" /> : <>
        <div className="pd-profile-main">
          <ConfidenceRing value={profile.confidencePercent} label={profile.confidenceLabel} />
          <div><strong>{profile.summary}</strong><p>{profile.lastRefreshed}</p></div>
        </div>
        <div className="pd-traits">{profile.traits.map((trait) => <span key={trait}>{trait}</span>)}</div>
        <div className="pd-card-row">
          <button type="button" className="pd-secondary-btn" disabled><RefreshCw size={16} aria-hidden="true" />Refresh Profile</button>
          <button type="button" className="pd-icon-button" aria-label="More profile options" disabled><MoreHorizontal size={18} aria-hidden="true" /></button>
        </div>
      </>}
    </section>
  );
}
