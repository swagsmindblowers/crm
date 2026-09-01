import { Readable } from "node:stream";
import { type auth, SESSION_COOKIE_NAME } from "@crm/auth";
import { DOCUMENT_MAX_BYTES, readDocument } from "@crm/db/blob";
import {
	BadRequestException,
	Controller,
	Get,
	NotFoundException,
	Param,
	Post,
	Res,
	UploadedFile,
	UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
	ApiConsumes,
	ApiCookieAuth,
	ApiOkResponse,
	ApiOperation,
	ApiParam,
	ApiTags,
} from "@nestjs/swagger";
import { Session, type UserSession } from "@thallesp/nestjs-better-auth";
import type { Express, Response } from "express";
import "multer";
import { DocumentChecklistService } from "./document-checklist.service";

type CrmSession = UserSession<typeof auth>;

@ApiTags("Matters")
@ApiCookieAuth(SESSION_COOKIE_NAME)
@Controller("api/matters/:matterId/documents/:checklistItemId/uploads")
export class DocumentChecklistUploadController {
	constructor(private readonly checklist: DocumentChecklistService) {}

	@Post()
	@UseInterceptors(
		FileInterceptor("file", { limits: { fileSize: DOCUMENT_MAX_BYTES } }),
	)
	@ApiConsumes("multipart/form-data")
	@ApiParam({ name: "matterId" })
	@ApiParam({ name: "checklistItemId" })
	@ApiOperation({ summary: "Upload a document against a checklist item" })
	@ApiOkResponse({ description: "The stored upload, pending staff review." })
	async upload(
		@Param("matterId") matterId: string,
		@Param("checklistItemId") checklistItemId: string,
		@UploadedFile() file: Express.Multer.File | undefined,
		@Session() session: CrmSession,
	) {
		if (!file) {
			throw new BadRequestException("No file was uploaded.");
		}

		return this.checklist.upload({
			checklistItemId,
			matterId,
			filename: file.originalname,
			contentType: file.mimetype,
			bytes: file.buffer,
			uploadedBy: { kind: "staff", userId: session.user.id },
		});
	}

	@Get(":uploadId/download")
	@ApiParam({ name: "matterId" })
	@ApiParam({ name: "checklistItemId" })
	@ApiParam({ name: "uploadId" })
	@ApiOperation({ summary: "Download a document uploaded against a matter" })
	@ApiOkResponse({ description: "The stored file." })
	async download(
		@Param("matterId") matterId: string,
		@Param("checklistItemId") checklistItemId: string,
		@Param("uploadId") uploadId: string,
		@Res({ passthrough: false }) response: Response,
		@Session() _session: CrmSession,
	) {
		const upload = await this.checklist.uploadForDownload({
			uploadId,
			checklistItemId,
			matterId,
		});

		const document = await readDocument(upload.blobUrl);
		if (!document) {
			throw new NotFoundException("That file could not be found.");
		}

		response.setHeader("Content-Type", document.contentType);
		response.setHeader("X-Content-Type-Options", "nosniff");
		response.setHeader(
			"Content-Disposition",
			`attachment; filename="${encodeURIComponent(upload.filename)}"`,
		);
		Readable.fromWeb(document.stream).pipe(response);
	}
}
