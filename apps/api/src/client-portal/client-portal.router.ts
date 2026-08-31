import { Inject } from "@nestjs/common";
import { Input, Mutation, Router, UseMiddlewares } from "nestjs-trpc";
import type { z } from "zod";
import { AuthMiddleware } from "../trpc/middlewares/auth.middleware";
import { restMeta } from "../trpc/openapi";
import {
	issueLoginLinkInput,
	issueLoginLinkOutput,
} from "./client-portal.contracts";
import { ClientPortalService } from "./client-portal.service";

@Router({ alias: "clientPortal" })
@UseMiddlewares(AuthMiddleware)
export class ClientPortalRouter {
	constructor(
		@Inject(ClientPortalService) private readonly portal: ClientPortalService,
	) {}

	@Mutation({
		input: issueLoginLinkInput,
		output: issueLoginLinkOutput,
		meta: restMeta("POST", "/contacts/{contactId}/portal-link", ["Contacts"]),
	})
	async issueLoginLink(@Input() input: z.infer<typeof issueLoginLinkInput>) {
		return this.portal.issueLoginLink(input.contactId);
	}
}
