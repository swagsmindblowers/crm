import { DOCUMENT_MAX_BYTES } from "@crm/db/blob";
import {
	BadRequestException,
	Controller,
	Param,
	Post,
	Req,
	UploadedFile,
	UseGuards,
	UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
	ApiConsumes,
	ApiOkResponse,
	ApiOperation,
	ApiParam,
	ApiTags,
} from "@nestjs/swagger";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";
import type { Express } from "express";
import "multer";
import { DocumentChecklistService } from "../document-checklist/document-checklist.service";
import { ClientPortalMattersService } from "./client-portal-matters.service";
import {
	ClientSessionGuard,
	type ClientSessionRequest,
} from "./client-session.guard";

@ApiTags("Client Portal")
@Controller(
	"api/client-portal/matters/:matterId/documents/:checklistItemId/uploads",
)
@AllowAnonymous()
@UseGuards(ClientSessionGuard)
export class ClientPortalDocumentsController {
	constructor(
		private readonly matters: ClientPortalMattersService,
		private readonly checklist: DocumentChecklistService,
	) {}

	@Post()
	@UseInterceptors(
		FileInterceptor("file", { limits: { fileSize: DOCUMENT_MAX_BYTES } }),
	)
	@ApiConsumes("multipart/form-data")
	@ApiParam({ name: "matterId" })
	@ApiParam({ name: "checklistItemId" })
	@ApiOperation({ summary: "Upload a document as the signed-in client" })
	@ApiOkResponse({ description: "The stored upload, pending staff review." })
	async upload(
		@Param("matterId") matterId: string,
		@Param("checklistItemId") checklistItemId: string,
		@UploadedFile() file: Express.Multer.File | undefined,
		@Req() request: ClientSessionRequest,
	) {
		if (!file) {
			throw new BadRequestException("No file was uploaded.");
		}

		await this.matters.assertVisible(request.clientSession.contactId, matterId);

		return this.checklist.upload({
			checklistItemId,
			matterId,
			filename: file.originalname,
			contentType: file.mimetype,
			bytes: file.buffer,
			uploadedBy: {
				kind: "client",
				clientAccountId: request.clientSession.clientAccountId,
			},
		});
	}
}
