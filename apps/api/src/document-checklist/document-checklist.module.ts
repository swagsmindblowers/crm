import { Module } from "@nestjs/common";
import { TrpcModule } from "../trpc/trpc.module";
import { DocumentChecklistRouter } from "./document-checklist.router";
import { DocumentChecklistService } from "./document-checklist.service";
import { DocumentChecklistUploadController } from "./document-checklist-upload.controller";

@Module({
	imports: [TrpcModule],
	controllers: [DocumentChecklistUploadController],
	providers: [DocumentChecklistService, DocumentChecklistRouter],
	exports: [DocumentChecklistService],
})
export class DocumentChecklistModule {}
