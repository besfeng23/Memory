# Pandora Memory Engine Architecture

Pandora Memory Engine is a production-grade Memory Operating System for controlled, auditable AI memory across two strictly separated domains: real-life memory and AU/story memory. It is designed to preserve durable context without allowing fictional continuity to contaminate real-world evidence, or real-world facts to enter fictional continuity without explicit fictionalization.

## Current Implementation Boundary

This document defines the required architecture for future implementation tasks. It does **not** mean the memory engine, database schema, retrieval system, OpenAI integration, AU canon guard, or patch writer currently exist. UI and API surfaces must never pretend that planned features are live.

## Source of Truth

The source of truth is the Pandora Supabase Postgres database.

ChatGPT or OpenAI built-in memory is not the source of truth. Model memory may help a chat product personalize responses, but Pandora must only trust durable state that has been written to, validated in, and audited through the application database.

## Memory Namespaces

Every user-owned memory row must include both `user_id` and `namespace`.

### Real-Life Memory Namespace

The real-life namespace is for evidence-sensitive information about actual people, businesses, decisions, promises, risks, relationships, events, sources, and consequences. Real-life memory must prioritize exact dates, source confidence, evidence references, uncertainty, and auditability.

### AU / Story Memory Namespace

The AU/story namespace is for fictional alternate-universe continuity, world canon, character canon, relationship states, scene history, unresolved threads, retcons, and consequences. AU/story memory must preserve hard canon, character consistency, emotional realism, and consequence progression.

## Strict Namespace Isolation Rule

Real-life memory and AU/story memory must never contaminate each other.

- AU events must never be used as real-life evidence.
- Real-life facts may only be referenced in AU/story output when explicitly allowed and marked as fictionalized.
- Every query must include a namespace filter before ranking, retrieval, or generation.
- Every write must include a namespace and must be validated against namespace rules before patching.
- Cross-namespace retrieval is forbidden by default and must not be hidden inside convenience helpers.

## Memory Loop

All future memory features must follow this loop:

```text
classify → retrieve → generate → extract → validate → patch → update derived state → audit
```

1. **Classify:** Determine namespace, intent, memory type, and whether the request is real-life or AU/story.
2. **Retrieve:** Query only the permitted namespace and user-owned rows. Log every retrieval.
3. **Generate:** Use the appropriate prompt contract and retrieved context.
4. **Extract:** Extract only durable memory candidates, not every sentence.
5. **Validate:** Check namespace isolation, source confidence, contradictions, canon conflicts, and safety rules.
6. **Patch:** Store accepted changes as append-only patches. Never silently overwrite memory.
7. **Update derived state:** Recompute or update derived views, such as character state or relationship state, from accepted patches.
8. **Audit:** Record write decisions, validation results, actor, timestamp, and affected records.

## Append-Only Patch Design

Pandora must preserve original memory history. Durable memory concepts can have current derived summaries, but changes to those concepts must be represented as append-only patches.

A patch records a proposed or accepted change, correction, contradiction, confidence update, retcon, source attachment, or deletion marker. Patches must include enough metadata for audit and reconstruction: user, namespace, source, confidence, memory type, validation status, and timestamp.

Direct mutation of memory history is prohibited. Soft delete is represented as a patch or inactive flag plus audit log. Hard delete is reserved for explicit admin action and must also be audited.

## Derived State vs. Original Patch History

Original patch history is the durable record. Derived state is a computed or maintained view that makes the product fast and usable.

Examples of derived state include:

- A current memory item summary.
- Current AU character state.
- Current AU relationship metrics.
- Current real-life risk status.
- Timeline-visible promise or decision status.

Derived state may be updated after a patch is accepted, but it must never erase the patch trail. If derived state conflicts with patch history, patch history wins and the derived state must be rebuilt or corrected.

## Real-Life Memory vs. AU/Story Memory

Real-life memory is evidence-sensitive and accountability-focused. It needs source confidence, dates, promises, decisions, risks, and uncertainty tracking.

AU/story memory is continuity-sensitive and fiction-focused. It needs hard canon, soft canon, character behavior rules, emotional consequence, scene history, unresolved threads, and retcon handling.

Both domains use append-only memory, validation, audit logs, and namespace isolation. They differ in what counts as evidence, what validation means, and what derived state is maintained.

## UI Honesty Rule

The UI must not pretend unimplemented features work. Planned pages, cards, buttons, dashboards, routes, and integrations must be clearly labeled as planned or stubbed until backed by real service-layer behavior, database persistence, validation, and audit logging.
