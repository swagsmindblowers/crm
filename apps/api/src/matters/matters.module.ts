import { Module } from "@nestjs/common";
import { AgentModule } from "../agent/agent.module";
import { CurrencyModule } from "../currency/currency.module";
import { DocumentChecklistModule } from "../document-checklist/document-checklist.module";
import { FieldsModule } from "../fields/fields.module";
import { TrpcModule } from "../trpc/trpc.module";
import { MattersRouter } from "./matters.router";
import { MattersService } from "./matters.service";

@Module({
	imports: [
		AgentModule,
		FieldsModule,
		TrpcModule,
		CurrencyModule,
		DocumentChecklistModule,
	],
	providers: [MattersService, MattersRouter],
	exports: [MattersService],
})
export class MattersModule {}
