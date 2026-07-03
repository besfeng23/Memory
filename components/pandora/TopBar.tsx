import { Bell, Search } from "lucide-react";

export function TopBar() {
  return (
    <header className="pd-topbar">
      <div className="pd-mobile-brand"><div className="pd-brand-mark">P</div><strong>Pandora</strong></div>
      <label className="pd-search"><Search size={18} aria-hidden="true" /><input aria-label="Ask Pandora" placeholder={'Ask Pandora… e.g. "What changed since the last refresh?"'} /></label>
      <div className="pd-top-actions"><button type="button" className="pd-workspace">Personal Workspace</button><button type="button" className="pd-icon-button" aria-label="Notifications"><Bell size={18} aria-hidden="true" /></button><div className="pd-avatar" aria-label="User avatar">U</div></div>
    </header>
  );
}
