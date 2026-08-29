import { Module } from "@nestjs/common";
import { TrpcModule } from "../trpc/trpc.module";
import { DocumentChecklistRouter } from "./document-checklist.router";
import { DocumentChecklistService } from "./document-checklist.service";

@Module({
	imports: [TrpcModule],
	providers: [DocumentChecklistService, DocumentChecklistRouter],
	exports: [DocumentChecklistService],
})
export class DocumentChecklistModule {}
