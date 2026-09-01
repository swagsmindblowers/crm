import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { restRequest } from "../rest-client";
import { toolResult } from "./tool-result";

const matterIdShape = {
	matterId: z.string().describe("The matter's id."),
};

const createShape = {
	matterId: z.string().describe("The matter's id."),
	label: z.string().describe("The name of the document being requested."),
	description: z.string().optional(),
	required: z.boolean().optional(),
};

const updateShape = {
	matterId: z.string().describe("The matter's id."),
	id: z.string().describe("The checklist item's id."),
	label: z.string().optional(),
	description: z.string().optional(),
	required: z.boolean().optional(),
};

export function registerDocumentTools(server: McpServer, apiKey: string): void {
	server.registerTool(
		"list_documents",
		{
			title: "List documents",
			description:
				"List a matter's document checklist: requested documents and any files uploaded against each.",
			inputSchema: matterIdShape,
		},
		async ({ matterId }) =>
			toolResult(
				await restRequest(apiKey, "GET", `/matters/${matterId}/documents`),
			),
	);

	server.registerTool(
		"add_document_checklist_item",
		{
			title: "Add document checklist item",
			description:
				"Request a new document from the client by adding it to a matter's document checklist. This does not upload a file.",
			inputSchema: createShape,
		},
		async ({ matterId, ...data }) =>
			toolResult(
				await restRequest(
					apiKey,
					"POST",
					`/matters/${matterId}/documents`,
					data,
				),
			),
	);

	server.registerTool(
		"update_document_checklist_item",
		{
			title: "Update document checklist item",
			description:
				"Update a document checklist item's label, description, or required flag.",
			inputSchema: updateShape,
		},
		async ({ matterId, id, ...data }) =>
			toolResult(
				await restRequest(
					apiKey,
					"PATCH",
					`/matters/${matterId}/documents/${id}`,
					data,
				),
			),
	);
}
