const MINUTE_MS = 60 * 1_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

export const CLIENT_PORTAL = {
	loginToken: { ttlMs: 30 * MINUTE_MS },
	session: { ttlMs: 7 * DAY_MS },
} as const;
