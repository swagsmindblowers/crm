import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { restRequest } from "../rest-client";
import { toolResult } from "./tool-result";

const searchShape = {
	q: z.string().optional().describe("Free-text search across name and email."),
	archived: z
		.boolean()
		.optional()
		.describe("List archived contacts instead of active ones."),
	page: z.number().int().min(1).optional(),
	pageSize: z.number().int().min(1).max(100).optional(),
};

const idShape = {
	id: z.string().describe("The contact's id."),
};

const createShape = {
	firstName: z.string().describe("The contact's first name."),
	lastName: z.string().optional(),
	email: z.string().optional(),
	phone: z.string().optional(),
	title: z.string().optional().describe("Job title."),
	companyId: z
		.string()
		.optional()
		.describe("The company this contact belongs to."),
	ownerId: z
		.string()
		.optional()
		.describe("The staff member who owns this contact."),
};

const updateShape = {
	id: z.string().describe("The contact's id."),
	firstName: z.string().optional(),
	lastName: z.string().optional(),
	email: z.string().optional(),
	phone: z.string().optional(),
	title: z.string().optional(),
	companyId: z.string().optional(),
	ownerId: z.string().optional(),
};

export function registerContactTools(server: McpServer, apiKey: string): void {
	server.registerTool(
		"search_contacts",
		{
			title: "Search contacts",
			description: "Search and list contacts (people) in the CRM.",
			inputSchema: searchShape,
		},
		async (args) =>
			toolResult(await restRequest(apiKey, "POST", "/contacts/search", args)),
	);

	server.registerTool(
		"get_contact",
		{
			title: "Get contact",
			description: "Get full detail for one contact by id.",
			inputSchema: idShape,
		},
		async ({ id }) =>
			toolResult(await restRequest(apiKey, "GET", `/contacts/${id}`)),
	);

	server.registerTool(
		"create_contact",
		{
			title: "Create contact",
			description: "Create a new contact.",
			inputSchema: createShape,
		},
		async (args) =>
			toolResult(await restRequest(apiKey, "POST", "/contacts", args)),
	);

	server.registerTool(
		"update_contact",
		{
			title: "Update contact",
			description: "Update fields on an existing contact.",
			inputSchema: updateShape,
		},
		async ({ id, ...data }) =>
			toolResult(
				await restRequest(apiKey, "PATCH", `/contacts/${id}`, { data }),
			),
	);
}
