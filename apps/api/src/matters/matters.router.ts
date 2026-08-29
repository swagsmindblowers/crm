import { Inject } from "@nestjs/common";
import {
	Ctx,
	Input,
	Mutation,
	Query,
	Router,
	UseMiddlewares,
} from "nestjs-trpc";
import type { z } from "zod";
import type { AuthedTrpcContext } from "../trpc/context.types";
import { AuthMiddleware } from "../trpc/middlewares/auth.middleware";
import { restMeta } from "../trpc/openapi";
import {
	matterAttachContactInput,
	matterBulkInput,
	matterBulkOwnerInput,
	matterBulkResultOutput,
	matterBulkStageInput,
	matterContactLinkOutput,
	matterContactOptionsOutput,
	matterContactRoleInput,
	matterContactRoleOutput,
	matterContactsInput,
	matterCreateInput,
	matterCreateOutput,
	matterDetachContactInput,
	matterDetailOutput,
	matterIdInput,
	matterListInput,
	matterListOutput,
	matterMutateOutput,
	matterSetStageOutput,
	matterUpdateArgs,
	setStageInput,
} from "./matters.contracts";
import { MattersService } from "./matters.service";

@Router({ alias: "matters" })
@UseMiddlewares(AuthMiddleware)
export class MattersRouter {
	constructor(@Inject(MattersService) private readonly matters: MattersService) {}

	@Query({
		input: matterListInput,
		output: matterListOutput,
		meta: restMeta("POST", "/matters/search", ["Matters"]),
	})
	async list(@Input() input: z.infer<typeof matterListInput>) {
		return this.matters.list(input);
	}

	@Query({
		input: matterIdInput,
		output: matterDetailOutput,
		meta: restMeta("GET", "/matters/{id}", ["Matters"]),
	})
	async byId(@Input("id") id: string) {
		return this.matters.byId(id);
	}

	@Mutation({
		input: matterCreateInput,
		output: matterCreateOutput,
		meta: restMeta("POST", "/matters", ["Matters"]),
	})
	async create(@Input() input: z.infer<typeof matterCreateInput>) {
		return this.matters.create(input);
	}

	@Mutation({
		input: matterUpdateArgs,
		output: matterMutateOutput,
		meta: restMeta("PATCH", "/matters/{id}", ["Matters"]),
	})
	async update(@Input() input: z.infer<typeof matterUpdateArgs>) {
		return this.matters.update(input.id, input.data);
	}

	@Mutation({
		input: matterIdInput,
		output: matterMutateOutput,
		meta: restMeta("POST", "/matters/{id}/archive", ["Matters"]),
	})
	async archive(@Input("id") id: string) {
		return this.matters.archive(id);
	}

	@Mutation({
		input: matterIdInput,
		output: matterMutateOutput,
		meta: restMeta("POST", "/matters/{id}/restore", ["Matters"]),
	})
	async restore(@Input("id") id: string) {
		return this.matters.restore(id);
	}

	@Mutation({
		input: matterIdInput,
		output: matterMutateOutput,
		meta: restMeta("DELETE", "/matters/{id}", ["Matters"]),
	})
	async purge(@Input("id") id: string) {
		return this.matters.purge(id);
	}

	@Mutation({
		input: setStageInput,
		output: matterSetStageOutput,
		meta: restMeta("PATCH", "/matters/{id}/stage", ["Matters"]),
	})
	async setStage(
		@Ctx() ctx: AuthedTrpcContext,
		@Input() input: z.infer<typeof setStageInput>,
	) {
		return this.matters.setStage(input, ctx.user.id);
	}

	@Query({
		input: matterContactsInput,
		output: matterContactOptionsOutput,
		meta: restMeta("GET", "/matters/{matterId}/contact-options", ["Matters"]),
	})
	async contactOptions(@Input("matterId") matterId: string) {
		return this.matters.contactOptions(matterId);
	}

	@Mutation({
		input: matterAttachContactInput,
		output: matterContactLinkOutput,
		meta: restMeta("POST", "/matters/{matterId}/contacts", ["Matters"]),
	})
	async attachContact(@Input() input: z.infer<typeof matterAttachContactInput>) {
		return this.matters.attachContact(input);
	}

	@Mutation({
		input: matterDetachContactInput,
		output: matterContactLinkOutput,
		meta: restMeta("DELETE", "/matters/{matterId}/contacts/{contactId}", ["Matters"]),
	})
	async detachContact(@Input() input: z.infer<typeof matterDetachContactInput>) {
		return this.matters.detachContact(input);
	}

	@Mutation({
		input: matterContactRoleInput,
		output: matterContactRoleOutput,
		meta: restMeta("PATCH", "/matters/{matterId}/contacts/{contactId}/role", [
			"Matters",
		]),
	})
	async setContactRole(@Input() input: z.infer<typeof matterContactRoleInput>) {
		return this.matters.setContactRole(input);
	}

	@Mutation({
		input: matterBulkOwnerInput,
		output: matterBulkResultOutput,
		meta: restMeta("POST", "/matters/bulk-assign-owner", ["Matters"]),
	})
	async bulkAssignOwner(@Input() input: z.infer<typeof matterBulkOwnerInput>) {
		return this.matters.bulkAssignOwner(input);
	}

	@Mutation({
		input: matterBulkStageInput,
		output: matterBulkResultOutput,
		meta: restMeta("POST", "/matters/bulk-set-stage", ["Matters"]),
	})
	async bulkSetStage(
		@Ctx() ctx: AuthedTrpcContext,
		@Input() input: z.infer<typeof matterBulkStageInput>,
	) {
		return this.matters.bulkSetStage(input, ctx.user.id);
	}

	@Mutation({
		input: matterBulkInput,
		output: matterBulkResultOutput,
		meta: restMeta("POST", "/matters/bulk-archive", ["Matters"]),
	})
	async bulkArchive(@Input("ids") ids: string[]) {
		return this.matters.bulkArchive(ids);
	}

	@Mutation({
		input: matterBulkInput,
		output: matterBulkResultOutput,
		meta: restMeta("POST", "/matters/bulk-restore", ["Matters"]),
	})
	async bulkRestore(@Input("ids") ids: string[]) {
		return this.matters.bulkRestore(ids);
	}

	@Mutation({
		input: matterBulkInput,
		output: matterBulkResultOutput,
		meta: restMeta("POST", "/matters/bulk-purge", ["Matters"]),
	})
	async bulkPurge(@Input("ids") ids: string[]) {
		return this.matters.bulkPurge(ids);
	}
}
