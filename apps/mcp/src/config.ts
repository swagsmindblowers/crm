const MINUTE_MS = 60_000;

const API_URL = process.env.API_URL ?? "http://localhost:3001";

export const MCP_CONFIG = {
	server: {
		name: "mylegalxpert-crm",
		version: "0.0.1",
		port: Number(process.env.PORT ?? 3002),
	},
	api: {
		url: API_URL,
		baseUrl: `${API_URL}/rest`,
	},
	oauth: {
		secret: process.env.MCP_OAUTH_SECRET,
		codeTtlMs: 5 * MINUTE_MS,
	},
} as const;

export function oauthConfigured(): boolean {
	return Boolean(MCP_CONFIG.oauth.secret);
}
