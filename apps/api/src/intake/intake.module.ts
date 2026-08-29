import { Module } from "@nestjs/common";
import { AgentModule } from "../agent/agent.module";
import { CompaniesModule } from "../companies/companies.module";
import { TrpcModule } from "../trpc/trpc.module";
import { IntakeController } from "./intake.controller";
import { IntakeRouter } from "./intake.router";
import { IntakeService } from "./intake.service";

@Module({
	imports: [TrpcModule, AgentModule, CompaniesModule],
	controllers: [IntakeController],
	providers: [IntakeService, IntakeRouter],
})
export class IntakeModule {}
