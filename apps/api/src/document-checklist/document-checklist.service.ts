import {
	type Db,
	DocumentChecklistStatus,
	DocumentUploadReviewStatus,
} from "@crm/db";
import { uploadDocument } from "@crm/db/blob";
import {
	BadRequestException,
	Injectable,
	Logger,
	NotFoundException,
	ServiceUnavailableException,
} from "@nestjs/common";
import { blankToNull } from "../crm/values";
import { InjectDatabase } from "../database/database.constants";
import type {
	ChecklistCreateInput,
	ChecklistUpdateInput,
	ChecklistUploadReviewInput,
} from "./document-checklist.contracts";

const UPLOAD_SELECT = {
	id: true,
	filename: true,
	contentType: true,
	byteSize: true,
	blobUrl: true,
	reviewStatus: true,
	reviewNote: true,
	reviewedAt: true,
	createdAt: true,
	uploadedByUser: { select: { name: true } },
	uploadedByClientAccount: {
		select: { contact: { select: { firstName: true, lastName: true } } },
	},
} as const;

const ITEM_SELECT = {
	id: true,
	label: true,
	description: true,
	status: true,
	receivedAt: true,
	required: true,
	position: true,
	uploads: { select: UPLOAD_SELECT, orderBy: { createdAt: "desc" } },
} as const;

type UploadRow = {
	id: string;
	filename: string;
	contentType: string;
	byteSize: number;
	blobUrl: string;
	reviewStatus: DocumentUploadReviewStatus;
	reviewNote: string | null;
	reviewedAt: Date | null;
	createdAt: Date;
	uploadedByUser: { name: string } | null;
	uploadedByClientAccount: {
		contact: { firstName: string; lastName: string | null };
	} | null;
};

export type UploadedBy =
	| { kind: "staff"; userId: string }
	| { kind: "client"; clientAccountId: string };

type ItemRow = {
	id: string;
	label: string;
	description: string | null;
	status: DocumentChecklistStatus;
	receivedAt: Date | null;
	required: boolean;
	position: number;
	uploads: UploadRow[];
};

type ChecklistItemUpdate = {
	label?: string;
	description?: string | null;
	status?: DocumentChecklistStatus;
	receivedAt?: Date | null;
	required?: boolean;
};

function clientAccountName(
	account: UploadRow["uploadedByClientAccount"],
): string | null {
	if (!account) return null;
	const { firstName, lastName } = account.contact;
	return lastName ? `${firstName} ${lastName}` : firstName;
}

function serializeUpload(row: UploadRow) {
	return {
		id: row.id,
		filename: row.filename,
		contentType: row.contentType,
		byteSize: row.byteSize,
		url: row.blobUrl,
		uploadedByName:
			row.uploadedByUser?.name ??
			clientAccountName(row.uploadedByClientAccount),
		reviewStatus: row.reviewStatus,
		reviewNote: row.reviewNote,
		reviewedAt: row.reviewedAt?.toISOString() ?? null,
		createdAt: row.createdAt.toISOString(),
	};
}

function serialize(row: ItemRow) {
	return {
		...row,
		receivedAt: row.receivedAt?.toISOString() ?? null,
		uploads: row.uploads.map(serializeUpload),
	};
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
		const data: ChecklistItemUpdate = {};

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

	async upload(input: {
		checklistItemId: string;
		matterId: string;
		filename: string;
		contentType: string;
		bytes: Buffer;
		uploadedBy: UploadedBy;
	}) {
		const item = await this.db.documentChecklistItem.findFirst({
			where: { id: input.checklistItemId, matterId: input.matterId },
			select: { id: true },
		});
		if (!item) {
			throw new NotFoundException("That document is not on this matter.");
		}

		const stored = await uploadDocument(input.bytes, {
			prefix: `checklist-${input.checklistItemId}`,
			contentType: input.contentType,
		});
		if (!stored.ok) {
			if (stored.code === "not-configured") {
				throw new ServiceUnavailableException(stored.reason);
			}
			throw new BadRequestException(stored.reason);
		}

		const row = await this.db.checklistDocumentUpload.create({
			data: {
				checklistItemId: input.checklistItemId,
				blobUrl: stored.url,
				filename: input.filename,
				contentType: input.contentType,
				byteSize: stored.byteSize,
				uploadedByUserId:
					input.uploadedBy.kind === "staff" ? input.uploadedBy.userId : null,
				uploadedByClientAccountId:
					input.uploadedBy.kind === "client"
						? input.uploadedBy.clientAccountId
						: null,
			},
			select: UPLOAD_SELECT,
		});

		this.logger.log({
			message: "Document uploaded against a checklist item",
			checklistItemId: input.checklistItemId,
			uploadId: row.id,
		});

		return serializeUpload(row);
	}

	async reviewUpload(input: ChecklistUploadReviewInput, reviewerId: string) {
		const upload = await this.db.checklistDocumentUpload.findFirst({
			where: {
				id: input.id,
				checklistItem: { matterId: input.matterId },
			},
			select: { id: true },
		});
		if (!upload) {
			throw new NotFoundException("That upload is not on this matter.");
		}

		const row = await this.db.checklistDocumentUpload.update({
			where: { id: input.id },
			data: {
				reviewStatus: input.decision,
				reviewNote: input.note ? blankToNull(input.note) : null,
				reviewedAt: new Date(),
				reviewedById: reviewerId,
			},
			select: UPLOAD_SELECT,
		});

		this.logger.log({
			message: "Checklist upload reviewed",
			uploadId: row.id,
			decision: input.decision,
		});

		return serializeUpload(row);
	}
}
