import { Module } from "@nestjs/common";
import { GoogleModule } from "../google/google.module";
import { MailboxModule } from "../mailbox/mailbox.module";
import { MicrosoftModule } from "../microsoft/microsoft.module";
import { TrpcModule } from "../trpc/trpc.module";
import { ClientPortalController } from "./client-portal.controller";
import { ClientPortalRouter } from "./client-portal.router";
import { ClientPortalService } from "./client-portal.service";
import { ClientPortalMailerService } from "./client-portal-mailer.service";
import { ClientSessionGuard } from "./client-session.guard";

@Module({
	imports: [TrpcModule, MailboxModule, GoogleModule, MicrosoftModule],
	controllers: [ClientPortalController],
	providers: [
		ClientPortalService,
		ClientPortalMailerService,
		ClientPortalRouter,
		ClientSessionGuard,
	],
	exports: [ClientPortalService],
})
export class ClientPortalModule {}
