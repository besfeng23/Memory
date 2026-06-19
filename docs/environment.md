# Environment Documentation

Pandora Memory Engine uses local `.env.local` files for development and Vercel environment variables for deployed environments. Keep public browser-safe values separate from server-only secrets.

## Local Development

Create `.env.local` from `.env.example` and fill in development credentials only. Do not commit `.env.local`.

Recommended local setup:

```bash
npm install
cp .env.example .env.local
npm run dev
```

Use local or development Supabase credentials for local development. Do not use production service role keys on a shared machine.

## Vercel Environment Variables

Configure variables separately for Vercel Production, Preview, and Development. Production should use production Supabase and OpenAI credentials. Preview should use preview or staging credentials when possible. Development should use local or development credentials.

When syncing Vercel env values locally, prefer pulling only Development variables into `.env.local`. Never sync production secrets to machines or branches that do not need them.

## Supabase / Vercel Integration Variables

Supabase and Vercel integrations may provide database URLs and Postgres variables such as `DATABASE_URL`, `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`, `POSTGRES_USER`, `POSTGRES_HOST`, `POSTGRES_PASSWORD`, and `POSTGRES_DATABASE`. These are server-only unless explicitly documented otherwise by the provider.

## Public Variables

The following variables are intended to be browser-safe when configured correctly:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

The Supabase anon key is public by design, but RLS must still protect all user data.

## Server-Only Variables

The following variables are server-only:

- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`
- `POSTGRES_USER`
- `POSTGRES_HOST`
- `POSTGRES_PASSWORD`
- `POSTGRES_DATABASE`
- `SUPABASE_JWT_SECRET`
- `OPENAI_API_KEY`
- `PANDORA_ACTIONS_API_KEY`
- `MCP_SERVER_TOKEN`

## NEXT_PUBLIC_ Rule

Never use `NEXT_PUBLIC_` for service role keys, database URLs, OpenAI keys, JWT secrets, Actions keys, or MCP tokens. Any variable with `NEXT_PUBLIC_` can be bundled into client-side JavaScript and viewed by users.

## Deployment Environments

- **Production:** real production Supabase project, production OpenAI key, production app URL, strict RLS, no test credentials.
- **Preview:** staging or preview Supabase project where possible, preview app URL, safe test data, no production service role key unless explicitly required and approved.
- **Development:** local `.env.local`, local or dev Supabase, no production secrets.
