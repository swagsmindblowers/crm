import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MCP_CONFIG } from "./config";
import { registerTools } from "./tools/index";

export function createMcpServer(apiKey: string): McpServer {
	const server = new McpServer({
		name: MCP_CONFIG.server.name,
		version: MCP_CONFIG.server.version,
	});

	registerTools(server, apiKey);

	return server;
}
