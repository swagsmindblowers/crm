import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { restRequest } from "../rest-client";
import { toolResult } from "./tool-result";

const searchShape = {
	q: z.string().optional().describe("Free-text search across name and domain."),
	archived: z
		.boolean()
		.optional()
		.describe("List archived companies instead of active ones."),
	page: z.number().int().min(1).optional(),
	pageSize: z.number().int().min(1).max(100).optional(),
};

const idShape = {
	id: z.string().describe("The company's id."),
};

const createShape = {
	name: z.string().describe("The company's name."),
	domain: z.string().optional().describe("The company's primary web domain."),
	ownerId: z
		.string()
		.optional()
		.describe("The staff member who owns this company."),
};

const updateShape = {
	id: z.string().describe("The company's id."),
	name: z.string().optional(),
	domain: z.string().optional(),
	website: z.string().optional(),
	description: z.string().optional(),
	industry: z.string().optional(),
	city: z.string().optional(),
	country: z.string().optional(),
	phone: z.string().optional(),
	email: z.string().optional(),
	ownerId: z.string().optional(),
};

export function registerCompanyTools(server: McpServer, apiKey: string): void {
	server.registerTool(
		"search_companies",
		{
			title: "Search companies",
			description: "Search and list companies in the CRM.",
			inputSchema: searchShape,
		},
		async (args) =>
			toolResult(await restRequest(apiKey, "POST", "/companies/search", args)),
	);

	server.registerTool(
		"get_company",
		{
			title: "Get company",
			description: "Get full detail for one company by id.",
			inputSchema: idShape,
		},
		async ({ id }) =>
			toolResult(await restRequest(apiKey, "GET", `/companies/${id}`)),
	);

	server.registerTool(
		"create_company",
		{
			title: "Create company",
			description: "Create a new company.",
			inputSchema: createShape,
		},
		async (args) =>
			toolResult(await restRequest(apiKey, "POST", "/companies", args)),
	);

	server.registerTool(
		"update_company",
		{
			title: "Update company",
			description: "Update fields on an existing company.",
			inputSchema: updateShape,
		},
		async ({ id, ...data }) =>
			toolResult(
				await restRequest(apiKey, "PATCH", `/companies/${id}`, { data }),
			),
	);
}
