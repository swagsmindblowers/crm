import { Controller, Get, Param, Req, UseGuards } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";
import { ClientPortalMattersService } from "./client-portal-matters.service";
import {
	ClientSessionGuard,
	type ClientSessionRequest,
} from "./client-session.guard";

@ApiTags("Client Portal")
@Controller("api/client-portal/matters")
@AllowAnonymous()
@UseGuards(ClientSessionGuard)
export class ClientPortalMattersController {
	constructor(private readonly matters: ClientPortalMattersService) {}

	@Get()
	@ApiOperation({ summary: "List the matters visible to the signed-in client" })
	@ApiOkResponse({ description: "Matters with a simplified status." })
	list(@Req() request: ClientSessionRequest) {
		return this.matters.list(request.clientSession.contactId);
	}

	@Get(":matterId")
	@ApiOperation({ summary: "Get one matter visible to the signed-in client" })
	@ApiOkResponse({ description: "The matter, with its document checklist." })
	detail(
		@Param("matterId") matterId: string,
		@Req() request: ClientSessionRequest,
	) {
		return this.matters.detail(request.clientSession.contactId, matterId);
	}
}
