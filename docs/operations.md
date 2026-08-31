# Operations — rollback and secret rotation

This app runs on Railway (see the project's own dashboard for service names).
There is no infra-as-code for it in this repo — every step below is manual,
through Railway's dashboard or its API, not a script here.

## Rollback

Railway keeps every past deployment for each service. To roll back:

1. Open the service (`api`, `agent`, or `app`) in the Railway dashboard.
2. Open its **Deployments** tab and find the last deployment that was known
   good.
3. Use **Redeploy** on that deployment. Railway rebuilds and serves it again
   without touching the other services.
4. If the rollback follows a bad Prisma migration, redeploying old code is
   not enough — the schema has already moved. Restore the database from a
   backup taken before the migration ran (Railway's Postgres service has its
   own **Backups** tab; confirm a recent one exists before you need it, see
   below), then redeploy the old `api` build against the restored database.
5. Confirm the rollback worked: check `GET /health` on the `api` service
   (`{"status":"ok","database":"up"}`), and watch its logs for a clean boot
   with no migration or connection errors.

A rollback that only reverts code, with a migration already applied, can
leave the old code pointed at a schema it doesn't understand — check whether
a migration shipped in the bad deploy before rolling back code alone.

## Database backups

Railway Postgres backup and retention settings live on the Postgres
service's own **Backups** tab in the dashboard — not in this repo, and not
verifiable from code. Check that tab directly, and confirm it matches what
you'd actually want to restore from before you need it.

`packages/db`'s `db:reset` and `db:seed` scripts are not backups — `db:reset`
is destructive (drops and recreates the schema) and `db:seed` only loads
fixture data. Neither substitutes for a real backup.

## Secret rotation

These five secrets exist. None have automatic rotation — rotate manually on
whatever cadence your organization requires (a reasonable default is every 90
days, or immediately after anyone with access to them leaves):

- `BETTER_AUTH_SECRET` — signs session cookies. Rotating it invalidates every
  active session; everyone is signed out and has to sign in again. Safe to
  rotate at any time, expect a wave of re-logins right after.
- `CRON_SECRET` — bearer token the cron services use to call the API's
  `internal/*` routes. Rotate it on the `api` service and on all five cron
  services in the same change, or the crons start failing with 401s until
  both sides agree again.
- `INTAKE_SHARED_SECRET` — the `x-intake-secret` header Power Automate sends.
  Rotate it on the `api` service and update the value configured in whatever
  external tool posts to `/api/intake/submissions` in the same change, or
  intake submissions start being rejected.
- `AGENT_BRIDGE_SECRET` — shared between `api` and `agent`. Rotate on both
  services together, or the two stop trusting each other's requests.
- OAuth client secrets (Google, Microsoft, Slack) — rotated from the
  provider's own console (Google Cloud Console, Entra admin center, Slack
  app settings), which issues the new value; update it on `api` and `app`
  immediately after, since the old value stops working the moment the
  provider rotates it.

General rule: generate the new value first, update every service that reads
it in one change (Railway redeploys each service you touch), then confirm
with a real sign-in / cron run / intake POST before considering the old value
safe to forget. None of these secrets are recoverable once forgotten —
Railway's variable list only shows that a value is set, never what it is.
