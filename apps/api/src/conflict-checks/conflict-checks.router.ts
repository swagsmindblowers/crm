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
	conflictCheckOutput,
	conflictDismissInput,
	conflictListInput,
	conflictListOutput,
	conflictRunInput,
	conflictRunOutput,
} from "./conflict-checks.contracts";
import { ConflictChecksService } from "./conflict-checks.service";

@Router({ alias: "conflictChecks" })
@UseMiddlewares(AuthMiddleware)
export class ConflictChecksRouter {
	constructor(
		@Inject(ConflictChecksService)
		private readonly conflicts: ConflictChecksService,
	) {}

	@Query({
		input: conflictListInput,
		output: conflictListOutput,
		meta: restMeta("POST", "/conflict-checks/list", ["Conflicts"]),
	})
	async list(@Input() input: z.infer<typeof conflictListInput>) {
		return this.conflicts.list(input);
	}

	@Mutation({
		input: conflictRunInput,
		output: conflictRunOutput,
		meta: restMeta("POST", "/conflict-checks/run", ["Conflicts"]),
	})
	async run(@Input() input: z.infer<typeof conflictRunInput>) {
		return this.conflicts.run(input);
	}

	@Mutation({
		input: conflictDismissInput,
		output: conflictCheckOutput,
		meta: restMeta("POST", "/conflict-checks/{id}/dismiss", ["Conflicts"]),
	})
	async dismiss(
		@Ctx() ctx: AuthedTrpcContext,
		@Input() input: z.infer<typeof conflictDismissInput>,
	) {
		return this.conflicts.dismiss(input.id, input.note, ctx.user.id);
	}
}
