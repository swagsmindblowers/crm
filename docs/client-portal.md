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
fields. `packages/validation/src/client-portal-status.ts` is the one place
`MatterStage` collapses into `ClientMatterStatus` (`in_progress`,
`submitted`, `decision_pending`, `approved`, `not_approved`, `withdrawn`)
and its display label — imported by both
`apps/api/src/client-portal/client-portal-matters.service.ts` (so the API
response never carries the raw stage) and the app's status badge
(`apps/app/app/(portal)/portal/portal-status-badge.tsx`). Never add a second
mapping — extend `STATUS_FOR_STAGE` in that one file if a new `MatterStage`
value needs a home.

## Visibility

`ClientPortalMattersService`'s private `visibleMatterWhere(contactId)` is
the single place this rule is expressed — both the list and the detail
endpoint call it, so a client can never probe an arbitrary matter id
(detail 404s exactly like "doesn't exist" for a matter that exists but
isn't visible — never a different status, that would leak existence):

- A `Contact` with `isCompanyAdmin: true` (staff sets this manually per
  contact — `contact-sheet.tsx`) sees every `Matter` under their `Company`.
- Everyone else sees only `Matter`s where their `Contact` is attached via
  `MatterContact`.

## Documents

A client uploads against a `DocumentChecklistItem` on a matter; staff
reviews it as accepted or rejected with an optional note. This extends the
existing checklist review flow in `apps/api/src/document-checklist`, it
does not replace it — see `ChecklistDocumentUpload` in
`packages/db/prisma/schema.prisma`. Allowed types: PDF, JPG, PNG, DOCX.
Cap: `DOCUMENT_MAX_BYTES` (10MB), enforced both by `FileInterceptor`'s
`limits.fileSize` and by `uploadDocument` (`packages/db/src/blob.ts`).

`DocumentChecklistService.upload()` takes a discriminated `uploadedBy:
{kind:"staff", userId} | {kind:"client", clientAccountId}` rather than a
bare user id, because `ChecklistDocumentUpload` has two separate nullable
FKs — `uploadedByUserId` and `uploadedByClientAccountId` — and exactly one
is ever set. `serializeUpload()` resolves whichever is present to a display
name (the client's `Contact` name for a client upload), so staff never see
a blank "uploaded by" for something a client sent in.

Two parallel controllers reach the same service:
- Staff: `document-checklist-upload.controller.ts`
  (`POST /api/matters/:matterId/documents/:checklistItemId/uploads`,
  better-auth staff session).
- Client: `client-portal-documents.controller.ts`
  (`POST /api/client-portal/matters/:matterId/documents/:checklistItemId/uploads`,
  `ClientSessionGuard`) — calls `ClientPortalMattersService.assertVisible()`
  before touching the checklist service, so a client can't upload against a
  matter it can't see even if it somehow has a valid checklist-item id.

Uploads store with `access: "private"` in Blob — the store itself must be
configured for private access, or every upload throws. A file is never
reachable by a bare URL. Each controller also exposes a matching
`GET .../uploads/:uploadId/download` route, gated behind the same session
guard as the upload route, that streams the file through
`readDocument()` (`packages/db/src/blob.ts`) rather than returning the
Blob URL directly — `checklistUploadOutput` (the upload contract) has no
`url` field. `MattersService.purge()` and `CompaniesService.purge()` call
`documentChecklist.blobUrlsForMatters()` before their delete transaction
runs (rows are gone after), then `deleteDocuments()` afterwards, so a
purge actually removes the stored files, not just the DB rows — this
matters for the 6-year IAA retention window.

## Client-facing pages (`apps/app/app/(portal)/portal/`)

A route group living outside `[slug]`, since `proxy.ts` already special
-cases `/portal` past the whole staff pipeline (see above) — every page
here gates itself via `readClientSession()`
(`apps/app/lib/client-portal-session.ts`), never the middleware.

- `sign-in/` — email entry, posts to `/api/client-portal/request-link`.
- `verify/` — reads `?token=`, posts to `/api/client-portal/verify` on
  mount, redirects to `/portal` on success.
- `portal-header.tsx` — an async server component that calls
  `readClientSession()` and, only when a session exists, renders
  `PortalSignOutButton`. That button posts to
  `POST /api/client-portal/sign-out` (`apps/app/lib/client-portal-sign-out.ts`)
  and redirects to `/portal/sign-in` regardless of whether the request
  succeeded — a client should always end up looking signed out. The
  endpoint itself (`ClientPortalController.signOut`) deletes the
  `ClientSession` row by its token hash and always clears the cookie
  (`clientSessionCookie("", new Date(0))`, the same attributes `verify`
  sets so the browser matches and overwrites it) even if no matching row
  existed — sign-out is idempotent by design.
- `page.tsx` — the dashboard: every matter `listPortalMatters()`
  (`apps/app/lib/portal-matters.ts`) returns, each with its simplified
  status badge; the company name only renders when more than one distinct
  company appears in the list (an individual client with one matter, or a
  company admin whose matters are all under their own company, never sees
  a redundant label).
- `matters/[matterId]/` — one matter's checklist, with a client-side
  upload button (`portal-checklist.tsx`) posting through
  `apps/app/lib/upload-portal-document.ts`, mirroring the staff upload
  helper (`upload-checklist-document.ts`) but hitting the client-portal
  endpoint.

`apps/app/lib/portal-matters.ts` and `client-portal-session.ts` both parse
every API response with Zod before trusting it — this app-side code never
imports the API's contracts directly (separate deployables), so each side
owns its own schema for the same wire shape and either would fail loudly on
drift rather than passing `unknown` through.
