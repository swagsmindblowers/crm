import { Module } from "@nestjs/common";
import { DocumentChecklistModule } from "../document-checklist/document-checklist.module";
import { GoogleModule } from "../google/google.module";
import { MailboxModule } from "../mailbox/mailbox.module";
import { MicrosoftModule } from "../microsoft/microsoft.module";
import { TrpcModule } from "../trpc/trpc.module";
import { ClientPortalController } from "./client-portal.controller";
import { ClientPortalRouter } from "./client-portal.router";
import { ClientPortalService } from "./client-portal.service";
import { ClientPortalDocumentsController } from "./client-portal-documents.controller";
import { ClientPortalMailerService } from "./client-portal-mailer.service";
import { ClientPortalMattersController } from "./client-portal-matters.controller";
import { ClientPortalMattersService } from "./client-portal-matters.service";
import { ClientSessionGuard } from "./client-session.guard";

@Module({
	imports: [
		TrpcModule,
		MailboxModule,
		GoogleModule,
		MicrosoftModule,
		DocumentChecklistModule,
	],
	controllers: [
		ClientPortalController,
		ClientPortalMattersController,
		ClientPortalDocumentsController,
	],
	providers: [
		ClientPortalService,
		ClientPortalMailerService,
		ClientPortalMattersService,
		ClientPortalRouter,
		ClientSessionGuard,
	],
	exports: [ClientPortalService],
})
export class ClientPortalModule {}
