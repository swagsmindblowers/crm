import { Module } from "@nestjs/common";
import { AgentModule } from "../agent/agent.module";
import { TrpcModule } from "../trpc/trpc.module";
import { ConflictChecksRouter } from "./conflict-checks.router";
import { ConflictChecksService } from "./conflict-checks.service";

@Module({
	imports: [AgentModule, TrpcModule],
	providers: [ConflictChecksService, ConflictChecksRouter],
	exports: [ConflictChecksService],
})
export class ConflictChecksModule {}
