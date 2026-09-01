import "@crm/env/load";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { MCP_CONFIG } from "./config";
import { createMcpServer } from "./mcp-server";

const CORS_HEADERS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "POST, OPTIONS",
	"Access-Control-Allow-Headers":
		"Content-Type, Authorization, x-api-key, Mcp-Session-Id, Mcp-Protocol-Version",
	"Access-Control-Expose-Headers": "Mcp-Session-Id",
} as const;

function withCors(response: Response): Response {
	for (const [key, value] of Object.entries(CORS_HEADERS)) {
		response.headers.set(key, value);
	}
	return response;
}

function extractApiKey(request: Request): string | null {
	const header = request.headers.get("x-api-key");
	if (header) return header;

	const auth = request.headers.get("authorization");
	if (auth?.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();

	return null;
}

function unauthorized(): Response {
	return new Response(
		JSON.stringify({
			error:
				"Missing or invalid CRM API key. Pass it as Authorization: Bearer <key> or x-api-key. Mint one at /settings/api-keys.",
		}),
		{ status: 401, headers: { "content-type": "application/json" } },
	);
}

async function handleMcp(request: Request): Promise<Response> {
	const apiKey = extractApiKey(request);
	if (!apiKey) return unauthorized();

	const server = createMcpServer(apiKey);
	const transport = new WebStandardStreamableHTTPServerTransport({
		sessionIdGenerator: undefined,
	});

	await server.connect(transport);
	return transport.handleRequest(request);
}

Bun.serve({
	port: MCP_CONFIG.server.port,
	async fetch(request) {
		const url = new URL(request.url);

		if (request.method === "OPTIONS") {
			return withCors(new Response(null, { status: 204 }));
		}

		if (url.pathname === "/health") {
			return new Response("ok", { status: 200 });
		}

		if (url.pathname === "/mcp") {
			if (request.method !== "POST") {
				return withCors(
					new Response("This server is stateless: only POST is supported.", {
						status: 405,
					}),
				);
			}
			return withCors(await handleMcp(request));
		}

		return new Response("Not found", { status: 404 });
	},
});

console.log(
	`MCP server listening on http://localhost:${MCP_CONFIG.server.port}`,
);
