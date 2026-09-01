import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerCompanyTools } from "./companies";
import { registerContactTools } from "./contacts";
import { registerDocumentTools } from "./documents";
import { registerMatterTools } from "./matters";

export function registerTools(server: McpServer, apiKey: string): void {
	registerMatterTools(server, apiKey);
	registerContactTools(server, apiKey);
	registerCompanyTools(server, apiKey);
	registerDocumentTools(server, apiKey);
}
