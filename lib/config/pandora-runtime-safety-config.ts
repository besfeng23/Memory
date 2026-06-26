export type PandoraRuntimeGate =
  | "persistedMemoryReadEnabled"
  | "adminPersistenceConsoleEnabled"
  | "approvedReviewPersistenceEnabled"
  | "operatorQaFlowEnabled"
  | "memoryCaptureApiEnabled"
  | "memoryContextApiEnabled"
  | "memoryDistillationEnabled"
  | "chatgptActionBridgeEnabled"
  | "memoryBridgeTestWriteEnabled"
  | "ingestProductionWriteEnabled"
  | "publicMemoryReadEnabled"
  | "publicMemoryPersistenceEnabled"
  | "modelCallsEnabled"
  | "embeddingsEnabled"
  | "semanticRetrievalEnabled"
  | "gptActionsEnabled"
  | "mcpEnabled";

export type PandoraRuntimeGateStatus = { enabled: boolean; envVar: string; safeDefault: false; dangerous: boolean };
export type PandoraRuntimeSafetyConfig = Record<PandoraRuntimeGate, boolean>;
export type PandoraRuntimeSafetyConfigResult = { config: PandoraRuntimeSafetyConfig; gates: Record<PandoraRuntimeGate, PandoraRuntimeGateStatus> };

const vars: Record<PandoraRuntimeGate, string> = {
  persistedMemoryReadEnabled: "PANDORA_ENABLE_PERSISTED_MEMORY_READ",
  adminPersistenceConsoleEnabled: "PANDORA_ENABLE_ADMIN_PERSISTENCE_CONSOLE",
  approvedReviewPersistenceEnabled: "PANDORA_ENABLE_APPROVED_REVIEW_MEMORY_PERSISTENCE",
  operatorQaFlowEnabled: "PANDORA_ENABLE_OPERATOR_MEMORY_QA_FLOW",
  memoryCaptureApiEnabled: "PANDORA_ENABLE_MEMORY_CAPTURE_API",
  memoryContextApiEnabled: "PANDORA_ENABLE_MEMORY_CONTEXT_API",
  memoryDistillationEnabled: "PANDORA_ENABLE_MEMORY_DISTILLATION",
  chatgptActionBridgeEnabled: "PANDORA_ENABLE_CHATGPT_ACTION_BRIDGE",
  memoryBridgeTestWriteEnabled: "PANDORA_ENABLE_MEMORY_BRIDGE_TEST_WRITE",
  ingestProductionWriteEnabled: "PANDORA_ENABLE_MEMORY_INGEST_PRODUCTION_WRITES",
  publicMemoryReadEnabled: "PANDORA_ENABLE_PUBLIC_MEMORY_READ",
  publicMemoryPersistenceEnabled: "PANDORA_ENABLE_PUBLIC_MEMORY_PERSISTENCE",
  modelCallsEnabled: "PANDORA_ENABLE_MODEL_CALLS",
  embeddingsEnabled: "PANDORA_ENABLE_EMBEDDINGS",
  semanticRetrievalEnabled: "PANDORA_ENABLE_SEMANTIC_RETRIEVAL",
  gptActionsEnabled: "PANDORA_ENABLE_GPT_ACTIONS",
  mcpEnabled: "PANDORA_ENABLE_MCP",
};

export function resolvePandoraRuntimeSafetyConfig(env: Partial<NodeJS.ProcessEnv> = process.env): PandoraRuntimeSafetyConfigResult {
  const config = Object.fromEntries(Object.entries(vars).map(([key, envVar]) => [key, env[envVar] === "true"])) as PandoraRuntimeSafetyConfig; // env[v] === "true"
  const gates = Object.fromEntries(
    Object.entries(vars).map(([key, envVar]) => [
      key,
      {
        enabled: config[key as PandoraRuntimeGate],
        envVar,
        safeDefault: false,
        dangerous: key !== "persistedMemoryReadEnabled",
      },
    ]),
  ) as Record<PandoraRuntimeGate, PandoraRuntimeGateStatus>;
  return { config, gates };
}
