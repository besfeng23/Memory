# Phase 4A ChatGPT Action setup

Normal/default ChatGPT will not automatically read Pandora Memory. Use a Custom GPT Action, an API wrapper, or the copyable context pack on `/admin/memory/bridge`.

## Create a Custom GPT

1. Open ChatGPT and create a Custom GPT.
2. Add the OpenAPI schema from `/pandora-memory-openapi.json`.
3. Configure authentication as Bearer token.
4. Store the value of `PANDORA_MEMORY_BRIDGE_TOKEN` as the Action credential. Do not paste it into prompts.
5. Keep `PANDORA_ENABLE_CHATGPT_ACTION_BRIDGE=false` until you are intentionally testing the Action bridge.

## Exact GPT instructions

Use Pandora Memory only through the configured Action. Ask `getMemoryContext` before complex project, people, risk, or planning work. Use `captureMemoryEvent` only when the user explicitly asks you to remember or capture something. Use `distillMemoryContext` only when the user asks for a daily or master context refresh. Never claim memory was saved unless the Action returns `ok: true`.

## Test prompts

- “Ask Pandora what projects I’m working on.”
- “Capture this as memory.”
- “What should you remember from today?”
- “What are my open loops?”
- “What risks am I ignoring?”

## Security notes

The Action uses Bearer auth. There is no anonymous access. Public reads and public writes remain disabled. The bridge does not enable embeddings, semantic retrieval, model calls, GPT Actions globally, or MCP.
