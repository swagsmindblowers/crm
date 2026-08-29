import { ConflictCheckStatus, type Db, type Prisma } from "@crm/db";
import type { ConflictMatch } from "@crm/db/conflicts";
import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { AgentTriggerService } from "../agent/agent-trigger.service";
import { InjectDatabase } from "../database/database.constants";

const CHECK_SELECT = {
	id: true,
	status: true,
	matches: true,
	checkedAt: true,
	dismissedAt: true,
	dismissedNote: true,
} as const;

type CheckRow = {
	id: string;
	status: ConflictCheckStatus;
	matches: Prisma.JsonValue;
	checkedAt: Date;
	dismissedAt: Date | null;
	dismissedNote: string | null;
};

function serialize(row: CheckRow) {
	return {
		id: row.id,
		status: row.status,
		matches: (Array.isArray(row.matches) ? row.matches : []) as ConflictMatch[],
		checkedAt: row.checkedAt.toISOString(),
		dismissedAt: row.dismissedAt?.toISOString() ?? null,
		dismissedNote: row.dismissedNote,
	};
}

@Injectable()
export class ConflictChecksService {
	private readonly logger = new Logger(ConflictChecksService.name);

	constructor(
		@InjectDatabase() private readonly db: Db,
		private readonly agent: AgentTriggerService,
	) {}

	async list(target: { matterId?: string; contactId?: string }) {
		const checks = await this.db.conflictCheck.findMany({
			where: {
				matterId: target.matterId,
				contactId: target.contactId,
			},
			select: CHECK_SELECT,
			orderBy: { checkedAt: "desc" },
			take: 20,
		});

		return { checks: checks.map(serialize) };
	}

	async run(target: { matterId?: string; contactId?: string }) {
		const queued = await this.agent.conflictCheckRequested(
			target,
			"Conflict check requested",
		);

		this.logger.log({
			message: "Conflict check requested",
			matterId: target.matterId,
			contactId: target.contactId,
			queued,
		});

		return { queued };
	}

	async dismiss(id: string, note: string, actingUserId: string) {
		const { count } = await this.db.conflictCheck.updateMany({
			where: { id, status: ConflictCheckStatus.POTENTIAL_CONFLICT },
			data: {
				status: ConflictCheckStatus.DISMISSED,
				dismissedAt: new Date(),
				dismissedById: actingUserId,
				dismissedNote: note.trim(),
			},
		});

		if (count === 0) {
			throw new NotFoundException(
				"That conflict flag is gone or already settled.",
			);
		}

		const row = await this.db.conflictCheck.findUniqueOrThrow({
			where: { id },
			select: CHECK_SELECT,
		});

		this.logger.log({ message: "Conflict flag dismissed", checkId: id });

		return serialize(row);
	}
}
