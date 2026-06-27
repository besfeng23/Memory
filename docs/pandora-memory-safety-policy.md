# Pandora Memory Safety Policy

All adaptive memory remains private, user-scoped, namespace-scoped, source-backed, patch/audit-backed where persisted, and review-gated for sensitive/private material. Public read and public persistence must remain false unless a future reviewed public-sharing phase explicitly changes that.

Secrets are detected and redacted before model calls, embeddings, logs, candidates, context packs, and audits. Secret candidates are blocked as `secret_or_credential` / `blocked_secret` and raw values are not saved.
