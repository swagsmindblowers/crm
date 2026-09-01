# MCP server — Rules for AI Agents

`apps/mcp` lets Claude (or any MCP client) connect to this CRM directly:
search and read matters, contacts, companies and documents, and create or
update records. It never deletes, archives, purges, bulk-mutates, reviews a
document upload, or accepts a file upload — those stay staff-UI-only.

## Auth: the caller's own personal API key, nothing new

There is no separate MCP credential. A rep mints a personal key at
`/settings/api-keys` (`packages/auth/src/api-keys.ts`) and supplies it to
their MCP client as `Authorization: Bearer <key>` or `x-api-key: <key>`.
`apps/mcp` reads that header per request and forwards it as `x-api-key` to
`${API_URL}/rest/...` — the same REST bridge `trpc-to-openapi` already
generates from every tRPC procedure (`apps/api/src/trpc/openapi.ts`).

A key "acts as you": no scopes, no workspace concept (this app is
single-tenant). Revoking the key at `/settings/api-keys` cuts the MCP
server off immediately, since `apps/mcp` stores nothing itself.

`apps/mcp` never touches `@crm/db` or Better Auth directly. It is a thin,
stateless MCP↔REST adapter — the same "REST surface for tooling that
cannot speak tRPC" the bridge was already built for.

## Stateless, one server instance per request

`src/main.ts` creates a fresh `McpServer` (`src/mcp-server.ts`) and a
`WebStandardStreamableHTTPServerTransport` with `sessionIdGenerator:
undefined` on every `POST /mcp`, closing the tool handlers over that
request's API key. This is deliberate: different callers carry different
keys, so nothing about a connection can be cached or shared across
requests. `GET`/`DELETE /mcp` are not implemented — there is no session to
resume or terminate.

## Tools live in `src/tools/`, one file per entity

Each tool's Zod `inputSchema` is a small, hand-written, LLM-friendly
subset — not a re-export of `apps/api`'s internal contracts (those aren't
a published package export, and the full internal shapes are noisier than
a model needs). The REST bridge still does the real, complete validation
server-side; a slim client-side schema is a UX choice; it is not a
correctness boundary.

Two REST body shapes to get right when adding a tool:

- `PATCH /matters/{id}`, `/contacts/{id}`, `/companies/{id}` expect the
  body as `{ "data": { ...fields } }` — the router's input type is
  `{id, data}` and `id` is bound from the path, but `data` still has to be
  present as a literal wrapper key in the body. Forgetting the wrapper is
  the most common mistake here (confirmed against a running server while
  building this).
- `PATCH /matters/{matterId}/documents/{id}` is flat (`checklistUpdateInput`
  has no `data` wrapper) — send the fields directly.

When in doubt, read the router file's `restMeta(...)` call and the Zod
schema it references in `*.contracts.ts` before guessing the REST shape.

## `packages/env` gives `API_URL`, no new required variable

`src/config.ts` reads `process.env.API_URL` (already documented in
`docs/environment.md`) and `process.env.PORT`. Nothing else is required —
there is no service credential to provision for this app.

## Deployment

Railway service `mcp`, same project, root directory `apps/mcp`, deployed
from `release` alongside `api`/`agent`/`app`. Needs its own generated
domain so an MCP client has a URL to connect to.
