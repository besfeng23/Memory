# Approved review memory persistence preview

This PR adds a preview-only layer for converting `approved_for_append` review queue items into future memory persistence plans. An approved review item is not memory yet, and the preview does not create memory source, item, patch, audit, embedding, retrieval, pgvector, GPT Actions, MCP, or production write records.

The preview shows the append-only operations a future internal/admin-gated executor may perform:

- memory source append plan
- memory item append plan
- memory patch append plan
- audit log append plan

Every preview response and planned operation returns `wouldPersist: false`. Real persistence remains future transactional, internal/admin-gated work and must continue to derive user identity from server repository context rather than client-supplied `user_id` or `userId`.

Namespace isolation is mandatory. AU/story memory cannot become real-life evidence. Real-life memory cannot enter AU unless explicitly fictionalized and reviewed. Candidate content and namespace are preserved in the preview and must not be silently edited.

The production `/api/memory/ingest` route remains production-disabled and this preview does not activate approved-review persistence execution.
