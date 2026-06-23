# Internal operator memory QA flow

This PR adds an internal/test-only operator QA flow for the Pandora Memory Engine. It verifies the safe lifecycle from approved review to persisted readback:

1. review item loaded
2. append-only decision verified
3. persistence preview plan built
4. internal gate checked
5. persistence executed through injected executor only
6. persisted memory item read back
7. source, patch, and audit read back
8. browser/audit view verification

The flow is disabled by default and the public route stub does not wire live repositories or execute persistence. It does not expose public persistence, public unauthenticated reads, or normal client-triggered persistence. `/api/memory/ingest` remains production-disabled.

The QA path does not call models and does not add embeddings, pgvector, semantic retrieval, GPT Actions, or MCP. User identity must come from server auth/repository context; client-supplied `user_id` or `userId` is rejected.

All persisted writes remain append-only. Audit verification is required for success, namespace isolation is mandatory, AU/story memory cannot become real-life evidence, and real-life memory cannot enter AU unless explicitly fictionalized and reviewed.
