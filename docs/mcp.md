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

## `packages/env` gives `API_URL`, no new required variable for the header path

`src/config.ts` reads `process.env.API_URL` (already documented in
`docs/environment.md`) and `process.env.PORT`. A client that supplies the
header directly (`claude mcp add --transport http ... --header
"Authorization: Bearer crm_..."`, the pattern Claude Code uses) needs
nothing else.

## OAuth wrapper (`src/oauth/`) — for clients that require it

claude.ai's remote-connector setup does not try a manually-entered header
first. It probes unauthenticated, then walks an OAuth 2.1 discovery chain
(`.well-known/oauth-protected-resource`, `.well-known/oauth-authorization-server`,
dynamic client registration, `/authorize`) — confirmed from the real
traffic in Railway's `http` log for the `mcp` service the day this shipped.
Without those endpoints the whole connector reports "not found" before it
ever reaches the header you configured.

**The OAuth "access token" is just the user's existing CRM API key.**
There is still no credential store: the `/authorize` step is a
server-rendered HTML form (`src/oauth/authorize-page.ts`, no JS
framework) asking the visitor to paste their personal key — the same
value they'd otherwise put in `--header`. It's verified live against
`GET ${API_URL}/auth/me` (Better Auth's own "who am I" route,
`src/oauth/verify-api-key.ts`) so a typo is caught immediately. On
success, `/token` hands that same key back as `access_token`, and every
`/mcp` call already accepts it as `Authorization: Bearer <key>` — nothing
about the MCP transport itself changed.

The authorization code (`src/oauth/crypto.ts`) is **encrypted**, not
signed — unlike the JWT pattern in `apps/app/lib/agent-bridge.ts`, whose
claims are plaintext because none of them are secret. Here the payload
*is* a secret (the real API key), so it's AES-GCM, key derived from
`MCP_OAUTH_SECRET` via SHA-256, 5-minute expiry, with the PKCE
`code_challenge` bound into the encrypted payload (`src/oauth/pkce.ts`
verifies `code_verifier` against it — S256 only, no `plain`). No refresh
tokens are issued; a revoked CRM key just means re-running `/authorize`,
same as it would with the static-header path.

**Known trade-off, not fixed**: because nothing is persisted, an
authorization code is not single-use the way a normal OAuth code is — it
stays valid for the full 5-minute window even after one exchange. The
mitigations are the same ones that make the static-header path itself
acceptable: HTTPS-only transit, a short TTL, and the code being encrypted
rather than a plaintext credential. Making it truly single-use would mean
persisting spent codes somewhere, which is the one piece of state this
app was built to avoid.

If `MCP_OAUTH_SECRET` is unset, every OAuth endpoint returns 503
(`oauthConfigured()` in `src/config.ts`) — the header path above keeps
working regardless, matching the `apps/agent/agent/lib/capabilities.ts`
pattern for anything a self-hoster might not have configured.

## Deployment

Railway service `mcp`, same project, root directory `apps/mcp`, deployed
from `release` alongside `api`/`agent`/`app`. Needs its own generated
domain so an MCP client has a URL to connect to.
