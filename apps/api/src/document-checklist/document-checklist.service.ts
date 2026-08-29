import { type Db, DocumentChecklistStatus } from "@crm/db";
import {
	Injectable,
	Logger,
	NotFoundException,
} from "@nestjs/common";
import { blankToNull } from "../crm/values";
import { InjectDatabase } from "../database/database.constants";
import type {
	ChecklistCreateInput,
	ChecklistUpdateInput,
} from "./document-checklist.contracts";

const ITEM_SELECT = {
	id: true,
	label: true,
	description: true,
	status: true,
	receivedAt: true,
	required: true,
	position: true,
} as const;

type ItemRow = {
	id: string;
	label: string;
	description: string | null;
	status: DocumentChecklistStatus;
	receivedAt: Date | null;
	required: boolean;
	position: number;
};

function serialize(row: ItemRow) {
	return { ...row, receivedAt: row.receivedAt?.toISOString() ?? null };
}

@Injectable()
export class DocumentChecklistService {
	private readonly logger = new Logger(DocumentChecklistService.name);

	constructor(@InjectDatabase() private readonly db: Db) {}

	async list(matterId: string) {
		const items = await this.db.documentChecklistItem.findMany({
			where: { matterId },
			select: ITEM_SELECT,
			orderBy: { position: "asc" },
		});

		return {
			items: items.map(serialize),
			outstanding: items.filter(
				(item) =>
					item.required && item.status === DocumentChecklistStatus.OUTSTANDING,
			).length,
		};
	}

	async create(input: ChecklistCreateInput) {
		const matter = await this.db.matter.findUnique({
			where: { id: input.matterId },
			select: { id: true },
		});
		if (!matter) {
			throw new NotFoundException(`No matter with id ${input.matterId}.`);
		}

		const last = await this.db.documentChecklistItem.aggregate({
			where: { matterId: input.matterId },
			_max: { position: true },
		});

		const row = await this.db.documentChecklistItem.create({
			data: {
				matterId: input.matterId,
				label: input.label.trim(),
				description: input.description ? blankToNull(input.description) : null,
				required: input.required ?? true,
				position: (last._max.position ?? -1) + 1,
			},
			select: ITEM_SELECT,
		});

		this.logger.log({
			message: "Checklist item added",
			matterId: input.matterId,
			itemId: row.id,
		});

		return serialize(row);
	}

	async update(input: ChecklistUpdateInput) {
		const data: {
			label?: string;
			description?: string | null;
			status?: DocumentChecklistStatus;
			receivedAt?: Date | null;
			required?: boolean;
		} = {};

		if (input.label !== undefined) data.label = input.label.trim();
		if (input.description !== undefined) {
			data.description =
				input.description === null ? null : blankToNull(input.description);
		}
		if (input.required !== undefined) data.required = input.required;
		if (input.status !== undefined) {
			data.status = input.status;
			data.receivedAt =
				input.status === DocumentChecklistStatus.RECEIVED ? new Date() : null;
		}

		const { count } = await this.db.documentChecklistItem.updateMany({
			where: { id: input.id, matterId: input.matterId },
			data,
		});
		if (count === 0) {
			throw new NotFoundException("That document is not on this matter.");
		}

		const row = await this.db.documentChecklistItem.findUniqueOrThrow({
			where: { id: input.id },
			select: ITEM_SELECT,
		});

		return serialize(row);
	}

	async remove(input: { id: string; matterId: string }) {
		const { count } = await this.db.documentChecklistItem.deleteMany({
			where: { id: input.id, matterId: input.matterId },
		});
		if (count === 0) {
			throw new NotFoundException("That document is not on this matter.");
		}
		return { id: input.id };
	}
}
