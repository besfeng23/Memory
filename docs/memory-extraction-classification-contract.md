# Memory extraction and classification contract

This document defines the contract layer for turning raw user text into candidate memory facts, relationship signals, risks, promises, preferences, decisions, tasks, business context, family context, financial context, and AU/story continuity items.

## Scope

This layer is intentionally deterministic and testable. It introduces:

- `lib/services/memory-extraction-contract.ts` for shared extraction types.
- `lib/services/memory-namespace-classifier.ts` for deterministic namespace classification.
- `lib/services/deterministic-memory-extractor.ts` as a conservative fallback extractor and test harness.
- `lib/services/memory-extraction-validator.ts` for candidate safety validation before any future persistence step.

## Explicit non-goals

This PR does not introduce model-assisted ingestion. It does not call OpenAI or any model provider. It does not introduce embeddings, retrieval, pgvector, GPT Actions, or MCP. It does not activate `/api/memory/ingest` production writes, live Supabase writes, seed rows, or fake production rows.

The deterministic extractor returns candidates only. It never persists memory and reports `wouldCallModel: false` and `wouldPersist: false`.

## Namespace isolation

Every candidate must be classified into an explicit namespace before future persistence:

- `real_life` is for actual businesses, deals, people, contracts, emails, money, calendar items, family, work, health, government, legal, finance, and actual relationships.
- `au` is for explicitly fictional, AU, story, canon, character, scene, roleplay, simulation, or continuation content.
- `mixed_requires_review` blocks automated handling and requires human review.
- `blocked_unclear` blocks extraction when namespace signals are insufficient.

AU/story memory must never be treated as real-life evidence. Real-life memory must not enter AU unless it is explicitly marked fictionalized. Mixed real-person and fictional sexual/story content requires review.

## Candidate safety contract

Each extracted candidate includes namespace, candidate type, normalized text, evidence spans, confidence, sensitivity, proposed operation, append-only intent, review state, and source metadata. Source metadata must not carry client-supplied `user_id`; authenticated user identity must come only from server auth/repository context in future persistence layers.

Future persistence remains append-only by design. The validator rejects update, delete, and overwrite operations, rejects missing evidence, rejects inconsistent namespaces, requires `appendOnly: true`, and flags sensitive categories.

## Deterministic fallback extractor

The fallback extractor is not the final intelligence layer. It uses simple phrase rules such as `remember that`, `I promised`, `we decided`, risk/danger/concern words, AU/story/canon markers, business/financial keywords, and relationship phrases. It is intentionally conservative and may reject or omit ambiguous content rather than over-extract.
