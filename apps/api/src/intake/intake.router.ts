import { Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Query, Router, UseMiddlewares } from "nestjs-trpc";
import type { EnvironmentVariables } from "../config/env.validation";
import { AuthMiddleware } from "../trpc/middlewares/auth.middleware";
import { intakeStatusOutput } from "./intake.contracts";
import { IntakeService } from "./intake.service";

@Router({ alias: "intake" })
@UseMiddlewares(AuthMiddleware)
export class IntakeRouter {
	constructor(
		@Inject(IntakeService) private readonly intake: IntakeService,
		private readonly config: ConfigService<EnvironmentVariables, true>,
	) {}

	@Query({ output: intakeStatusOutput })
	async status() {
		const configured = Boolean(
			this.config.get("INTAKE_SHARED_SECRET", { infer: true }),
		);
		const { recent } = await this.intake.status();

		return {
			configured,
			endpointPath: "/api/intake/submissions" as const,
			recent,
		};
	}
}
