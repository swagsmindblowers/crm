export const MCP_CONFIG = {
	server: {
		name: "mylegalxpert-crm",
		version: "0.0.1",
		port: Number(process.env.PORT ?? 3002),
	},
	api: {
		baseUrl: `${process.env.API_URL ?? "http://localhost:3001"}/rest`,
	},
} as const;
