export const API_KEY_HEADER = "x-api-key";
export const API_KEY_PREFIX = "crm_";

export const DAY_SECONDS = 24 * 60 * 60;

export const API_KEY_EXPIRATION = {
	minDays: 1,
	maxDays: 365,
} as const;

const HOUR_MS = 60 * 60 * 1_000;

export const API_KEY_RATE_LIMIT = {
	windowMs: HOUR_MS,
	maxRequests: 1_000,
} as const;
