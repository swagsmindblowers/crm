import {
	Body,
	Controller,
	ForbiddenException,
	Headers,
	HttpCode,
	Logger,
	Post,
	ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
	ApiForbiddenResponse,
	ApiHeader,
	ApiOkResponse,
	ApiOperation,
	ApiServiceUnavailableResponse,
	ApiTags,
} from "@nestjs/swagger";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";
import type { z } from "zod";
import type { EnvironmentVariables } from "../config/env.validation";
import { intakeSubmission } from "./intake.contracts";
import { IntakeService } from "./intake.service";

type IntakeRequestBody = z.input<typeof intakeSubmission>;

@ApiTags("Intake")
@ApiHeader({
	name: "x-intake-secret",
	description: "`INTAKE_SHARED_SECRET`",
	required: true,
})
@ApiForbiddenResponse({ description: "x-intake-secret did not match." })
@ApiServiceUnavailableResponse({
	description: "INTAKE_SHARED_SECRET is not set.",
})
@Controller("api/intake")
export class IntakeController {
	private readonly logger = new Logger(IntakeController.name);
	private readonly secret: string | undefined;

	constructor(
		private readonly intake: IntakeService,
		config: ConfigService<EnvironmentVariables, true>,
	) {
		this.secret = config.get("INTAKE_SHARED_SECRET", { infer: true });
	}

	@Post("submissions")
	@AllowAnonymous()
	@HttpCode(202)
	@ApiOperation({
		summary: "Accept an intake form submission from Power Automate",
	})
	@ApiOkResponse({ description: "The submission was accepted for filing." })
	async submit(
		@Body() body: IntakeRequestBody,
		@Headers("x-intake-secret") secret?: string,
	) {
		if (!this.secret) {
			this.logger.error({
				message: "INTAKE_SHARED_SECRET is not set — refusing intake POSTs.",
			});
			throw new ServiceUnavailableException("Intake is not configured.");
		}

		if (!timingSafeEquals(secret ?? "", this.secret)) {
			throw new ForbiddenException();
		}

		const parsed = intakeSubmission.safeParse(body);
		if (!parsed.success) {
			return {
				filed: false,
				reason: parsed.error.issues[0]?.message ?? "Invalid payload",
			};
		}

		try {
			return await this.intake.submit(parsed.data);
		} catch (error) {
			this.logger.error(
				{ message: "Intake submission was not filed" },
				error instanceof Error ? error.stack : String(error),
			);
			return { filed: false, reason: "Could not file this submission" };
		}
	}
}

function timingSafeEquals(a: string, b: string): boolean {
	if (a.length !== b.length) return false;

	let mismatch = 0;
	for (let index = 0; index < a.length; index += 1) {
		mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index);
	}

	return mismatch === 0;
}
