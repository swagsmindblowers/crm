const SECOND_MS = 1_000;
const MINUTE_MS = 60 * SECOND_MS;

export const RATE_LIMIT = {
	default: { ttl: MINUTE_MS, limit: 100 },
	intake: { ttl: MINUTE_MS, limit: 20 },
} as const;
