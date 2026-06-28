import { resolvePandoraRuntimeSafetyConfig } from "@/lib/config/pandora-runtime-safety-config";
export default function MemoryCompactionAdminPage(){const r=resolvePandoraRuntimeSafetyConfig(); const safe=[
  ["Distillation gate",r.config.memoryDistillationEnabled],
  ["Model calls",r.config.modelCallsEnabled],
  ["Embeddings",r.config.embeddingsEnabled],
  ["Semantic retrieval",r.config.semanticRetrievalEnabled],
  ["Public memory read",r.config.publicMemoryReadEnabled],
  ["Public persistence",r.config.publicMemoryPersistenceEnabled],
]; return <main style={{padding:24,maxWidth:900}}><h1>Phase 5C Memory Compaction</h1><p>Daily compaction deterministically turns reviewed/captured memory into versioned profiles, open loops, and daily context packs. It does not call models, create embeddings, enable retrieval, or expose public reads/writes.</p><h2>Safety status</h2><ul>{safe.map(([label,value])=><li key={String(label)}><strong>{label}:</strong> {value?"enabled":"disabled"}</li>)}</ul><h2>Internal job</h2><p>POST <code>/api/memory/jobs/daily-digest</code> with <code>Authorization: Bearer $PANDORA_INTERNAL_JOB_TOKEN</code>.</p><pre>{JSON.stringify({namespace:"real_life",dry_run:true,since:new Date(Date.now()-86400000).toISOString()},null,2)}</pre><h2>Operator notes</h2><ul><li>Keep model calls, embeddings, semantic retrieval, public read/write, and permanent auto-capture off.</li><li>Run dry runs first, inspect profiles/open loops/context pack output, then run per namespace.</li></ul></main>}
