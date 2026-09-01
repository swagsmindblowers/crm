import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { restRequest } from "../rest-client";
import { toolResult } from "./tool-result";

const searchShape = {
	q: z
		.string()
		.optional()
		.describe("Free-text search across matter and company name."),
	stage: z
		.array(z.string())
		.optional()
		.describe("Filter to these pipeline stages."),
	archived: z
		.boolean()
		.optional()
		.describe("List archived matters instead of active ones."),
	page: z.number().int().min(1).optional(),
	pageSize: z.number().int().min(1).max(100).optional(),
};

const idShape = {
	id: z.string().describe("The matter's id."),
};

const createShape = {
	name: z.string().describe("The matter's name."),
	companyId: z
		.string()
		.describe("The id of the company this matter belongs to."),
	ownerId: z
		.string()
		.describe("The id of the staff member who owns this matter."),
	serviceType: z
		.string()
		.optional()
		.describe("The immigration service type key."),
	amountCents: z.number().int().min(0).optional(),
	currency: z.string().optional().describe("ISO 4217 currency code."),
	expectedCloseDate: z.string().optional().describe("ISO date string."),
};

const updateShape = {
	id: z.string().describe("The matter's id."),
	name: z.string().optional(),
	description: z.string().optional(),
	companyId: z.string().optional(),
	ownerId: z.string().optional(),
	serviceType: z.string().optional(),
	amountCents: z.number().int().min(0).optional(),
	currency: z.string().optional(),
	expectedCloseDate: z.string().optional(),
};

export function registerMatterTools(server: McpServer, apiKey: string): void {
	server.registerTool(
		"search_matters",
		{
			title: "Search matters",
			description:
				"Search and list matters (immigration cases) in the CRM. Returns matching rows plus totals and facet counts.",
			inputSchema: searchShape,
		},
		async (args) =>
			toolResult(await restRequest(apiKey, "POST", "/matters/search", args)),
	);

	server.registerTool(
		"get_matter",
		{
			title: "Get matter",
			description:
				"Get full detail for one matter by id, including key dates and contacts.",
			inputSchema: idShape,
		},
		async ({ id }) =>
			toolResult(await restRequest(apiKey, "GET", `/matters/${id}`)),
	);

	server.registerTool(
		"create_matter",
		{
			title: "Create matter",
			description: "Create a new matter under a company.",
			inputSchema: createShape,
		},
		async (args) =>
			toolResult(await restRequest(apiKey, "POST", "/matters", args)),
	);

	server.registerTool(
		"update_matter",
		{
			title: "Update matter",
			description: "Update fields on an existing matter.",
			inputSchema: updateShape,
		},
		async ({ id, ...data }) =>
			toolResult(
				await restRequest(apiKey, "PATCH", `/matters/${id}`, { data }),
			),
	);
}
