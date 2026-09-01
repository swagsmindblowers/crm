import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export function toolResult<T>(data: T): CallToolResult {
	return {
		content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
	} satisfies CallToolResult;
}
