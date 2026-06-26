import Link from "next/link";
import type { PersistedMemoryBrowserViewModel } from "@/lib/api/persisted-memory-browser-dto";
import { MemoryAuditTrail } from "./MemoryAuditTrail";
import { MemoryItemDetail } from "./MemoryItemDetail";
import { MemoryItemList } from "./MemoryItemList";
import { MemoryPatchTimeline } from "./MemoryPatchTimeline";
import { MemorySafetyBanner } from "./MemorySafetyBanner";
import { MemoryProofPanel } from "./MemoryProofPanel";
import { MemorySourcePanel } from "./MemorySourcePanel";

type GateMap = Record<string, { enabled?: boolean }>;
type BrowserRouteKind = "admin" | "public";

const gate = (viewModel: PersistedMemoryBrowserViewModel, key: string) => String((viewModel.gateStatuses as GateMap | undefined)?.[key]?.enabled ?? false);
const hasAuthBlocker = (viewModel: PersistedMemoryBrowserViewModel) => viewModel.blockers.some((blocker) => blocker.code === "auth_required");
const hasReadGateBlocker = (viewModel: PersistedMemoryBrowserViewModel) => viewModel.blockers.some((blocker) => blocker.message.toLowerCase().includes("read gate"));

function BrowserStateCard({ viewModel, routeKind }: Readonly<{ viewModel: PersistedMemoryBrowserViewModel; routeKind: BrowserRouteKind }>) {
  const authenticated = !hasAuthBlocker(viewModel);
  const readGateDisabled = hasReadGateBlocker(viewModel);
  const rowsHiddenByFilters = authenticated && !readGateDisabled && viewModel.items.length === 0 && Boolean(viewModel.filters.keyword || viewModel.filters.sourceId || viewModel.filters.memoryKind || viewModel.filters.createdFrom || viewModel.filters.createdTo || viewModel.filters.sourceType || viewModel.filters.proofStatus);
  const noRowsForSession = authenticated && !readGateDisabled && viewModel.items.length === 0 && !rowsHiddenByFilters;

  return (
    <section className="section-card browser-state-card" aria-label="Memory browser route and session state">
      <h2>{routeKind === "admin" ? "Phase 3B admin browser" : "Public browser shell only"}</h2>
      <div className="browser-state-grid">
        <span className={`browser-state-pill ${authenticated ? "browser-state-pill--ok" : "browser-state-pill--blocked"}`}>{authenticated ? "Authenticated" : "Not authenticated"}</span>
        <span className="browser-state-pill browser-state-pill--ok">Read-only</span>
        <span className="browser-state-pill">Namespace: {viewModel.filters.namespace ?? "not selected"}</span>
        {noRowsForSession ? <span className="browser-state-pill browser-state-pill--warn">No rows visible for this session</span> : null}
        {rowsHiddenByFilters ? <span className="browser-state-pill browser-state-pill--warn">Rows may be hidden by filters</span> : null}
        {readGateDisabled ? <span className="browser-state-pill browser-state-pill--blocked">Read gate disabled</span> : null}
        {!viewModel.detail ? <span className="browser-state-pill browser-state-pill--warn">Source/patch/audit proof pending</span> : null}
      </div>
      {routeKind === "public" ? (
        <p>This public foundation route does not enable persisted-memory reads. For Phase 3B proof work, open the authenticated admin browser.</p>
      ) : null}
      <div className="topbar__actions">
        {routeKind === "public" ? <Link className="button-link button-link--primary" href="/admin/memory/browser?namespace=real_life">Go to Phase 3B admin browser</Link> : null}
        {!authenticated ? <Link className="button-link button-link--primary" href={`/auth/login?next=${encodeURIComponent("/admin/memory/browser?namespace=real_life")}`}>Start operator session</Link> : null}
        <Link className="button-link" href="/api/session">Check session</Link>
      </div>
    </section>
  );
}

export function MemoryBrowserShell({ viewModel, routeKind = "admin" }: Readonly<{ viewModel: PersistedMemoryBrowserViewModel; routeKind?: BrowserRouteKind }>) {
  return (
    <div className="page-stack">
      <MemorySafetyBanner safety={viewModel} />
      <MemoryProofPanel commitSha={viewModel.proof?.commitSha} skillsCommit={viewModel.proof?.skillsCommit} skillsStatus={viewModel.proof?.skillsStatus} />
      <BrowserStateCard viewModel={viewModel} routeKind={routeKind} />
      <section className="section-card">
        <h2>Namespace selector/status</h2>
        <form className="memory-browser-filter-form">
          <label>Namespace <select name="namespace" defaultValue={viewModel.filters.namespace ?? ""}><option value="">Choose namespace</option><option value="real_life">real_life</option><option value="au">au</option></select></label>
          <label>Keyword filter <input name="keyword" defaultValue={viewModel.filters.keyword ?? ""} placeholder="keyword only" /></label>
          <label>Source id <input name="sourceId" defaultValue={viewModel.filters.sourceId ?? ""} /></label>
          <label>Source type <input name="sourceType" defaultValue={viewModel.filters.sourceType ?? ""} placeholder="review, import, receipt" /></label>
          <label>Proof status <select name="proofStatus" defaultValue={viewModel.filters.proofStatus ?? ""}><option value="">Any status</option><option value="patch proof available">Patch proof available</option><option value="proof not available">Proof not available</option></select></label>
          <label>Kind/category <input name="memoryKind" defaultValue={viewModel.filters.memoryKind ?? ""} /></label>
          <label className="memory-browser-filter-form__range">Date range <span><input name="createdFrom" defaultValue={viewModel.filters.createdFrom ?? ""} placeholder="from" /> <input name="createdTo" defaultValue={viewModel.filters.createdTo ?? ""} placeholder="to" /></span></label>
          <p>Keyword filter only — semantic retrieval is not enabled.</p>
          <button className="button-link" type="submit">Apply read-only filters</button>
        </form>
        {viewModel.blockers.map((b) => <p key={b.code} role="status">{b.message}</p>)}
      </section>
      <section className="section-card"><h2>Runtime gate status</h2><ul><li>read API: {gate(viewModel, "persistedMemoryReadEnabled")}</li><li>public read: {gate(viewModel, "publicMemoryReadEnabled")}</li><li>persistence execution: {gate(viewModel, "approvedReviewPersistenceEnabled")}</li><li>semantic retrieval: {gate(viewModel, "semanticRetrievalEnabled")}</li><li>model calls: {gate(viewModel, "modelCallsEnabled")}</li></ul></section>
      <section className="section-card"><h2>Disabled mutation controls</h2><p>No edit, delete, write, persist, or execute controls are available in this read-only browser.</p><button type="button" disabled aria-disabled="true">Mutation controls disabled</button></section>
      {viewModel.empty ? <section className="section-card"><h2>Empty state</h2><p>No persisted memories are available on this Phase 3B admin route for this authenticated namespace-scoped read. If you are authenticated, this usually means RLS found no rows for this exact Supabase user, or the current filters exclude them. Do not use /memory/browser for proof rows; it redirects here and public reads remain disabled.</p></section> : null}
      <div className="hero-grid"><MemoryItemList items={viewModel.items} selectedItemId={viewModel.selectedItemId} /><MemoryItemDetail detail={viewModel.detail} /></div>
      <div className="hero-grid"><MemorySourcePanel sources={viewModel.sources} /><MemoryPatchTimeline patches={viewModel.patches} /></div>
      <MemoryAuditTrail events={viewModel.auditEvents} />
    </div>
  );
}
