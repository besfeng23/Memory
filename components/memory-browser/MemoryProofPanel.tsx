import { NotAvailable } from "./ProofStatus";

type Props = Readonly<{ commitSha?: string; skillsCommit?: string; skillsStatus?: string }>;

export function MemoryProofPanel({ commitSha, skillsCommit, skillsStatus }: Props) {
  return (
    <section className="section-card" aria-label="Deployment and skills proof status">
      <h2>Skills commit proof</h2>
      <p>Read-only route proof metadata. Missing deployment values are non-fatal and shown as not configured.</p>
      <dl>
        <dt>Deployed commit SHA</dt><dd><NotAvailable value={commitSha ?? "not configured"} /></dd>
        <dt>Skills commit</dt><dd><NotAvailable value={skillsCommit ?? "not configured"} /></dd>
        <dt>Skills proof status</dt><dd><NotAvailable value={skillsStatus ?? "not configured"} /></dd>
        <dt>Browser recognition</dt><dd>{skillsStatus ? "recognized" : "not configured"}</dd>
      </dl>
    </section>
  );
}
