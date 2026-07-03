import type { ColorKey } from "./types";

export const COLORS: Record<ColorKey, { text: string; bg: string; iconBg: string; iconText: string; border: string; dot: string }> = {
  emerald: { text: "pd-text-emerald", bg: "pd-bg-emerald", iconBg: "pd-icon-bg-emerald", iconText: "pd-icon-text-emerald", border: "pd-border-emerald", dot: "pd-dot-emerald" },
  indigo: { text: "pd-text-indigo", bg: "pd-bg-indigo", iconBg: "pd-icon-bg-indigo", iconText: "pd-icon-text-indigo", border: "pd-border-indigo", dot: "pd-dot-indigo" },
  blue: { text: "pd-text-blue", bg: "pd-bg-blue", iconBg: "pd-icon-bg-blue", iconText: "pd-icon-text-blue", border: "pd-border-blue", dot: "pd-dot-blue" },
  amber: { text: "pd-text-amber", bg: "pd-bg-amber", iconBg: "pd-icon-bg-amber", iconText: "pd-icon-text-amber", border: "pd-border-amber", dot: "pd-dot-amber" },
  purple: { text: "pd-text-purple", bg: "pd-bg-purple", iconBg: "pd-icon-bg-purple", iconText: "pd-icon-text-purple", border: "pd-border-purple", dot: "pd-dot-purple" },
  red: { text: "pd-text-red", bg: "pd-bg-red", iconBg: "pd-icon-bg-red", iconText: "pd-icon-text-red", border: "pd-border-red", dot: "pd-dot-red" },
  slate: { text: "pd-text-slate", bg: "pd-bg-slate", iconBg: "pd-icon-bg-slate", iconText: "pd-icon-text-slate", border: "pd-border-slate", dot: "pd-dot-slate" },
};

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
