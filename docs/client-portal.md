# Client portal — rules for AI agents

Covers everything under `apps/api/src/client-portal`, the `/portal` route
group in `apps/app`, and the client-facing document upload and status
surfaces that read from it.

## The client portal is not a workspace member

This app is single-tenant. Every signed-in staff session auto-enrols into
the one `Organization` via `ensureWorkspaceMembership`
(`packages/auth/src/organization.ts`). A client must never join that
workspace, so the client portal does not use better-auth's session model at
all.

It has its own tables, its own cookie, its own guard:

- `ClientAccount` — one row per `Contact` who has portal access
  (`contactId` unique, `email`).
- `ClientLoginToken` — a one-time magic-link token. Only its sha256 hash is
  stored (`client-portal-token.ts`'s `hashToken`); the raw token exists only
  in the email link. 30-minute TTL (`CLIENT_PORTAL.loginToken.ttlMs`).
- `ClientSession` — a signed-in client's session. Same hashed-token pattern.
  7-day TTL (`CLIENT_PORTAL.session.ttlMs`).
- Cookie name: `CLIENT_SESSION_COOKIE_NAME` (`@crm/auth`), a distinct prefix
  from staff's `crm.session_token` — never the same cookie, never read by
  the staff-session guard.

`apps/app/proxy.ts` routes every `/portal` path past the staff
workspace/onboarding gates before those gates run a single query — a client
visitor never triggers `readWorkspaceGate` or `readResearchGate`. Auth for
`/portal` pages is the client portal's own concern, checked against
`GET /api/client-portal/me`, not the proxy.

## Two ways in, two different trust levels

- **Staff-facing**: `clientPortal.issueLoginLink` (tRPC mutation, staff-only,
  `ClientPortalService.issueLoginLink`). Staff can be trusted, so this is
  allowed to return the raw link in its response when no sender mailbox is
  configured, so staff can copy/paste it to the client directly.
- **Public self-service**: `POST /api/client-portal/request-link`
  (`ClientPortalController.requestLink`). This must never leak whether the
  email matched a real `ClientAccount` — it always responds `{ok:true}` and
  silently no-ops (with a server warn log) on no match or no sender
  configured. Never add a branch that returns a different status or body
  for "no such account." That is a user-enumeration hole.

## Magic-link email reuses a connected mailbox, deliberately

This app sends no other email. Rather than adding a transactional-email
provider, magic links go out through a mailbox the firm already connected
(Google or Microsoft), chosen once in Settings → Connections
(`portal-sender-section.tsx`, `SettingsService.setPortalSender`).

That requires a widened OAuth scope beyond the existing read-only
`gmail.readonly` / `Mail.Read`: `GMAIL_SEND_SCOPE` / `OUTLOOK_MAIL_SEND_SCOPE`
(`packages/auth/src/scopes.ts`). Anyone already connected before this
shipped has to reconnect once to grant it — `SettingsService.setPortalSender`
refuses to save an account that lacks the send scope
(`BadRequestException`), so this can't be silently misconfigured.

If no sender is designated, or the designated account's token can't be
used, `ClientPortalMailerService.send` returns a non-ok result. Both
`issueLoginLink` and `requestMagicLink` treat that as a capability that is
off, not a hard failure — matching `apps/agent/agent/lib/capabilities.ts`'s
pattern. `issueLoginLink` falls back to handing staff the raw link;
`requestMagicLink` just logs a warning, because it can never reveal to the
caller whether anything was sent.

## Status shown to a client is never the internal stage

Clients must never see raw `Matter.stage` values or other internal-only
fields. A simplified status vocabulary sits between `Matter.stage` and
whatever the client-facing dashboard renders.

**Not yet built.** No status-mapping table exists in code yet — this is
Phase 3 work (`apps/app/app/(client)/`, or a route group under `/portal`),
tracked separately from the auth module this doc otherwise describes.

## Visibility

- A `Contact` with `isCompanyAdmin: true` (staff sets this manually per
  contact — `contact-sheet.tsx`) sees every `Matter` under their `Company`.
- Everyone else sees only `Matter`s where their `Contact` is attached via
  `MatterContact`.

**Not yet built.** The dashboard/query that applies this rule does not
exist yet — also Phase 3.

## Documents

A client uploads against a `DocumentChecklistItem` on a matter; staff
reviews it as accepted or rejected with an optional note. This extends the
existing checklist review flow in `apps/api/src/document-checklist`, it
does not replace it — see `ChecklistDocumentUpload` in
`packages/db/prisma/schema.prisma` and
`document-checklist-upload.controller.ts`. Allowed types: PDF, JPG, PNG,
DOCX. Cap: `DOCUMENT_MAX_BYTES` (10MB), enforced both by
`FileInterceptor`'s `limits.fileSize` and by `uploadDocument`
(`packages/db/src/blob.ts`).

The staff-facing upload/review UI already exists in
`matter-sheet.tsx`'s document checklist section. A client-facing upload
button reachable from `/portal` — **not yet built**, Phase 3.
