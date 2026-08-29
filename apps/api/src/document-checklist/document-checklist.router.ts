import { Inject } from "@nestjs/common";
import { Input, Mutation, Query, Router, UseMiddlewares } from "nestjs-trpc";
import type { z } from "zod";
import { AuthMiddleware } from "../trpc/middlewares/auth.middleware";
import { restMeta } from "../trpc/openapi";
import {
	checklistCreateInput,
	checklistItemOutput,
	checklistListInput,
	checklistListOutput,
	checklistRemovedOutput,
	checklistRemoveInput,
	checklistUpdateInput,
} from "./document-checklist.contracts";
import { DocumentChecklistService } from "./document-checklist.service";

@Router({ alias: "documentChecklist" })
@UseMiddlewares(AuthMiddleware)
export class DocumentChecklistRouter {
	constructor(
		@Inject(DocumentChecklistService)
		private readonly checklist: DocumentChecklistService,
	) {}

	@Query({
		input: checklistListInput,
		output: checklistListOutput,
		meta: restMeta("GET", "/matters/{matterId}/documents", ["Matters"]),
	})
	async list(@Input("matterId") matterId: string) {
		return this.checklist.list(matterId);
	}

	@Mutation({
		input: checklistCreateInput,
		output: checklistItemOutput,
		meta: restMeta("POST", "/matters/{matterId}/documents", ["Matters"]),
	})
	async create(@Input() input: z.infer<typeof checklistCreateInput>) {
		return this.checklist.create(input);
	}

	@Mutation({
		input: checklistUpdateInput,
		output: checklistItemOutput,
		meta: restMeta("PATCH", "/matters/{matterId}/documents/{id}", ["Matters"]),
	})
	async update(@Input() input: z.infer<typeof checklistUpdateInput>) {
		return this.checklist.update(input);
	}

	@Mutation({
		input: checklistRemoveInput,
		output: checklistRemovedOutput,
		meta: restMeta("DELETE", "/matters/{matterId}/documents/{id}", ["Matters"]),
	})
	async remove(@Input() input: z.infer<typeof checklistRemoveInput>) {
		return this.checklist.remove(input);
	}
}
