# Coding Standards

These standards apply to future Pandora Memory Engine implementation tasks.

## TypeScript and Validation

TypeScript strict mode is mandatory. All API inputs must be validated with Zod before use. Shared enums for namespace, memory type, memory strength, confidence, and canon status must be validated at runtime as well as typed at compile time.

## Server and Client Separation

Server/client separation must be preserved. Server-only modules may use service credentials and database clients. React/client components must never import server-only modules, Supabase service role clients, OpenAI clients, database URLs, or secret-bearing helpers.

## Feature Honesty

Do not create fake completed features. Planned or stubbed behavior must be labeled as planned or stubbed in code, docs, and UI. UI pages must clearly distinguish planned, stubbed, and live features.

## Memory Write Safety

No silent memory overwrite is allowed. Memory changes must be append-only patches, validated before persistence, and audited after persistence. Derived state may be updated only from accepted patches and must not replace original history.

## Memory-Layer Comments

Every major function must include comments explaining which memory layer it belongs to, such as classification, retrieval, generation, extraction, validation, patching, derived state, audit, AU canon, or real-life evidence.

## API Route Structure

API routes must call service-layer functions where possible. Route handlers should parse authentication, validate input, call the service layer, and return responses. Business logic should not be buried directly in route files when it can be tested as a service.

## Secrets

The service role key must never be imported into React/client components. OpenAI credentials, database URLs, Supabase JWT secrets, GPT Actions keys, and MCP tokens are server-only.

## Test Discipline

Every future feature must include tests. Tests must preserve UI honesty and the no-fake-data rule. Memory-related tests must prove AU/story and real-life namespace isolation before the feature is treated as implemented.

Tests must not require production secrets, production Supabase connections, or fake operational memory data. CI must pass before merging.

## Required Test Coverage

Future implementation tasks must add test coverage for:

- Memory isolation between real-life and AU/story namespaces.
- Supabase RLS and user ownership.
- Append-only patching and audit behavior.
- AU canon behavior, including hard canon, retcons, recent scenes, and consequences.
- Real-life evidence handling, including source confidence, promises, risks, decisions, and uncertainty.

## UI Standards

UI must be clear, serious, and honest. It must not imply the memory engine is functional until database persistence, validation, retrieval logging, patching, and audit logging exist behind the UI.
