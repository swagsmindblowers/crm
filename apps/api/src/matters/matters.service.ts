import {
	ActivityType,
	type Db,
	type MatterStage,
	type Prisma,
	Prisma as PrismaNamespace,
} from "@crm/db";
import { deleteDocuments } from "@crm/db/blob";
import { normalizeCurrency } from "@crm/db/currency";
import type { FieldDefinitionWithOptions } from "@crm/db/fields";
import {
	CLOSED_MATTER_STAGES,
	isClosedStage,
	LOSING_MATTER_STAGES,
	OPEN_MATTER_STAGES,
} from "@crm/db/matter-stage";
import { checklistTemplateFor } from "@crm/validation/document-checklists";
import {
	type MatterServiceId,
	serviceDefaultFeeCents,
} from "@crm/validation/matter-services";
import {
	BadRequestException,
	Injectable,
	Logger,
	NotFoundException,
} from "@nestjs/common";
import { AgentTriggerService } from "../agent/agent-trigger.service";
import { ARCHIVE } from "../archive/archive-config";
import {
	ActivityStampService,
	type StampTargets,
} from "../crm/activity-stamp.service";
import { type BulkResult, requireOwner, runBulk } from "../crm/bulk";
import {
	blankToNull,
	decimalFromCents,
	fromCents,
	toCents,
} from "../crm/values";
import { ConversionService } from "../currency/conversion.service";
import { InjectDatabase } from "../database/database.constants";
import { DocumentChecklistService } from "../document-checklist/document-checklist.service";
import { FieldsService } from "../fields/fields.service";
import {
	archivedFilter,
	countsByKey,
	FACET_UNASSIGNED,
	type ListResult,
	type OrderByColumns,
	ownerFilter,
	paginate,
	resolveOrderBy,
} from "../trpc/list-input";
import type {
	ClosingWindow,
	MatterAttachContactInput,
	MatterBulkOwnerInput,
	MatterBulkStageInput,
	MatterContactRoleInput,
	MatterCreateInput,
	MatterDetachContactInput,
	MatterListInput,
	MatterUpdateInput,
	SetStageInput,
} from "./matters.contracts";
import { CLOSING_WINDOWS } from "./matters.contracts";

const OWNER_SELECT = {
	id: true,
	name: true,
	email: true,
	image: true,
} as const;

const COMPANY_SELECT = {
	id: true,
	name: true,
	domain: true,
	iconUrl: true,
	iconDarkUrl: true,
	iconTone: true,
	logoUrl: true,
} as const;

const CONTACT_SELECT = {
	id: true,
	firstName: true,
	lastName: true,
	email: true,
	title: true,
	imageUrl: true,
} as const;

const LOSING = new Set<MatterStage>(LOSING_MATTER_STAGES);

const KEY_DATE_FIELDS = [
	"applicationSubmittedAt",
	"biometricsAt",
	"decisionDueAt",
	"decisionReceivedAt",
	"visaExpiresAt",
	"conditionsExpireAt",
] as const;

const SORTABLE: OrderByColumns<Prisma.MatterOrderByWithRelationInput[]> = {
	name: (dir) => [{ name: dir }],
	company: (dir) => [{ company: { name: dir } }, { name: "asc" }],
	stage: (dir) => [{ stage: dir }, { expectedCloseDate: "asc" }],
	amount: (dir) => [{ baseAmount: { sort: dir, nulls: "last" } }],
	expectedCloseDate: (dir) => [{ expectedCloseDate: dir }],
	createdAt: (dir) => [{ createdAt: dir }],
	owner: (dir) => [{ owner: { name: dir } }, { name: "asc" }],
	lastActivity: (dir) => [{ lastActivityAt: { sort: dir, nulls: "last" } }],
	archivedAt: (dir) => [{ archivedAt: { sort: dir, nulls: "last" } }],
};

@Injectable()
export class MattersService {
	private readonly logger = new Logger(MattersService.name);

	constructor(
		@InjectDatabase() private readonly db: Db,
		private readonly agent: AgentTriggerService,
		private readonly stamp: ActivityStampService,
		private readonly conversion: ConversionService,
		private readonly fields: FieldsService,
		private readonly documentChecklist: DocumentChecklistService,
	) {}

	async list(input: MatterListInput) {
		const filterableFields = await this.fields.filterableFieldsFor("MATTER");
		const where = this.buildWhere(input, filterableFields);
		const { skip, take } = paginate(input);

		const openWhere = { ...where, stage: { in: [...OPEN_MATTER_STAGES] } };
		const base = await this.conversion.reportingCurrency();

		const [rows, total, facetCounts, openValue, unconverted] =
			await Promise.all([
				this.db.matter.findMany({
					where,
					skip,
					take,
					orderBy: resolveOrderBy(input, SORTABLE, [{ createdAt: "desc" }]),
					select: {
						id: true,
						name: true,
						stage: true,
						serviceType: true,
						paymentStatus: true,
						decisionDueAt: true,
						amount: true,
						currency: true,
						baseAmount: true,
						expectedCloseDate: true,
						closedAt: true,
						company: { select: COMPANY_SELECT },
						owner: { select: OWNER_SELECT },
						lastActivityAt: true,
						createdAt: true,
						archivedAt: true,
					},
				}),
				this.db.matter.count({ where }),
				this.facetCounts(input, filterableFields),
				this.db.matter.aggregate({
					where: { AND: [openWhere, this.conversion.countedWhere(base)] },
					_sum: { baseAmount: true },
				}),
				this.conversion.unconverted(openWhere),
			]);

		const tableFields = await this.fields.tableValuesFor(
			"MATTER",
			rows.map((row) => row.id),
		);

		return {
			rows: rows.map(
				({
					amount,
					baseAmount,
					expectedCloseDate,
					decisionDueAt,
					closedAt,
					lastActivityAt,
					createdAt,
					archivedAt,
					...row
				}) => ({
					...row,
					amountCents: toCents(amount),
					baseAmountCents: toCents(baseAmount),
					decisionDueAt: decisionDueAt?.toISOString() ?? null,
					expectedCloseDate: expectedCloseDate?.toISOString() ?? null,
					closedAt: closedAt?.toISOString() ?? null,
					lastActivityAt: lastActivityAt?.toISOString() ?? null,
					createdAt: createdAt.toISOString(),
					archivedAt: archivedAt?.toISOString() ?? null,
					fields: tableFields.get(row.id) ?? {},
				}),
			),
			total,
			facetCounts,
			openValueCents: toCents(openValue._sum.baseAmount),
			reportingCurrency: base,
			unconverted,
		} satisfies ListResult<unknown> & {
			openValueCents: number | null;
			reportingCurrency: string;
			unconverted: { count: number; currencies: string[] };
		};
	}

	async byId(id: string) {
		const matter = await this.db.matter.findUnique({
			where: { id },
			select: {
				id: true,
				name: true,
				description: true,
				stage: true,
				stageChangedAt: true,
				serviceType: true,
				paymentStatus: true,
				vatExcluded: true,
				disbursementsNotes: true,
				applicationSubmittedAt: true,
				biometricsAt: true,
				decisionDueAt: true,
				decisionReceivedAt: true,
				visaExpiresAt: true,
				conditionsExpireAt: true,
				amount: true,
				currency: true,
				baseAmount: true,
				fxRate: true,
				fxRateAt: true,
				expectedCloseDate: true,
				closedAt: true,
				closedReason: true,
				createdAt: true,
				archivedAt: true,
				company: { select: { ...COMPANY_SELECT, industry: true } },
				owner: { select: OWNER_SELECT },
				contacts: {
					select: { role: true, contact: { select: CONTACT_SELECT } },
					orderBy: { contact: { firstName: "asc" } },
				},
				keyDates: {
					select: { id: true, label: true, date: true, notes: true },
					orderBy: { date: "asc" },
				},
			},
		});

		if (!matter) {
			throw new NotFoundException(`No matter with id ${id}.`);
		}

		const {
			contacts,
			keyDates,
			amount,
			baseAmount,
			fxRate,
			fxRateAt,
			archivedAt,
			...rest
		} = matter;

		return {
			...rest,
			fields: await this.fields.valuesFor("MATTER", id),
			amountCents: toCents(amount),
			baseAmountCents: toCents(baseAmount),
			reportingCurrency: await this.conversion.reportingCurrency(),
			fxRate: fxRate?.toNumber() ?? null,
			fxRateAt: fxRateAt?.toISOString() ?? null,
			stageChangedAt: matter.stageChangedAt.toISOString(),
			applicationSubmittedAt:
				matter.applicationSubmittedAt?.toISOString() ?? null,
			biometricsAt: matter.biometricsAt?.toISOString() ?? null,
			decisionDueAt: matter.decisionDueAt?.toISOString() ?? null,
			decisionReceivedAt: matter.decisionReceivedAt?.toISOString() ?? null,
			visaExpiresAt: matter.visaExpiresAt?.toISOString() ?? null,
			conditionsExpireAt: matter.conditionsExpireAt?.toISOString() ?? null,
			expectedCloseDate: matter.expectedCloseDate?.toISOString() ?? null,
			closedAt: matter.closedAt?.toISOString() ?? null,
			createdAt: matter.createdAt.toISOString(),
			archivedAt: archivedAt?.toISOString() ?? null,
			contacts: contacts.map(({ role, contact }) => ({ ...contact, role })),
			keyDates: keyDates.map((row) => ({
				id: row.id,
				label: row.label,
				date: row.date.toISOString(),
				notes: row.notes,
			})),
		};
	}

	async addKeyDate(input: {
		matterId: string;
		label: string;
		date: string;
		notes?: string | null;
	}) {
		await this.companyOf(input.matterId);
		const date = parseDate(input.date);
		if (!date) {
			throw new BadRequestException("A key date needs a date.");
		}
		const row = await this.db.matterKeyDate.create({
			data: {
				matterId: input.matterId,
				label: input.label.trim(),
				date,
				notes: input.notes ? blankToNull(input.notes) : null,
			},
			select: { id: true, label: true, date: true, notes: true },
		});
		return { ...row, date: row.date.toISOString() };
	}

	async removeKeyDate(input: { matterId: string; keyDateId: string }) {
		const { count } = await this.db.matterKeyDate.deleteMany({
			where: { id: input.keyDateId, matterId: input.matterId },
		});
		if (count === 0) {
			throw new NotFoundException("That key date is not on this matter.");
		}
		return { id: input.keyDateId };
	}

	async create(input: MatterCreateInput) {
		const stage = input.stage ?? "ENQUIRY";
		const closed = isClosedStage(stage);
		const now = new Date();

		const serviceType = input.serviceType ?? "OTHER";
		const amountCents =
			input.amountCents === undefined
				? serviceDefaultFeeCents(serviceType)
				: input.amountCents;

		const currency = normalizeCurrency(
			input.currency ?? (await this.conversion.reportingCurrency()),
		);
		const fx = await this.conversion.matterFields(
			decimalFromCents(amountCents),
			currency,
		);

		try {
			const matter = await this.agent.withCrmEvents(async (tx, emit) => {
				const created = await tx.matter.create({
					data: {
						name: input.name.trim(),
						companyId: input.companyId,
						ownerId: input.ownerId,
						stage,
						serviceType,
						stageChangedAt: now,
						closedAt: closed ? now : null,
						amount: fromCents(amountCents),
						currency,
						...fx,
						expectedCloseDate: parseDate(input.expectedCloseDate),
					},
					select: { id: true, name: true, companyId: true },
				});
				const template = checklistTemplateFor(serviceType);
				if (template.length > 0) {
					await tx.documentChecklistItem.createMany({
						data: template.map((item, index) => ({
							matterId: created.id,
							label: item.label,
							description: item.description ?? null,
							required: item.required,
							position: index,
							templateKey: item.key,
						})),
					});
				}
				await emit({
					type: "matter.created",
					record: { kind: "matter", id: created.id },
					occurredAt: now,
					data: { companyId: created.companyId, stage },
				});
				if (closed) {
					await emit({
						type: "matter.closed",
						record: { kind: "matter", id: created.id },
						occurredAt: now,
						data: { companyId: created.companyId, from: null, to: stage },
					});
				}
				return created;
			});

			this.logger.log({
				message: "Matter created",
				matterId: matter.id,
				stage,
			});

			void this.fields.queueBackfillForNewRecord("MATTER", matter.id);
			void this.agent.conflictCheckRequested(
				{ matterId: matter.id },
				"New matter",
			);

			return matter;
		} catch (error) {
			throw this.translateRelations(error);
		}
	}

	async update(id: string, input: MatterUpdateInput) {
		const data: Prisma.MatterUpdateInput = {};

		if (input.name !== undefined) data.name = input.name.trim();
		if (input.description !== undefined) {
			data.description =
				input.description === null ? null : blankToNull(input.description);
		}
		if (input.companyId !== undefined) {
			data.company = { connect: { id: input.companyId } };
		}
		if (input.ownerId !== undefined) {
			data.owner = { connect: { id: input.ownerId } };
		}
		if (input.serviceType !== undefined) {
			data.serviceType = input.serviceType;
		}
		if (input.paymentStatus !== undefined) {
			data.paymentStatus = input.paymentStatus;
		}
		if (input.disbursementsNotes !== undefined) {
			data.disbursementsNotes =
				input.disbursementsNotes === null
					? null
					: blankToNull(input.disbursementsNotes);
		}
		for (const field of KEY_DATE_FIELDS) {
			const value = input[field];
			if (value !== undefined) {
				data[field] = parseDate(value);
			}
		}
		if (input.amountCents !== undefined) {
			data.amount = fromCents(input.amountCents);
		}
		if (input.currency !== undefined) {
			data.currency = normalizeCurrency(input.currency);
		}
		if (input.expectedCloseDate !== undefined) {
			data.expectedCloseDate = parseDate(input.expectedCloseDate);
		}

		if (input.amountCents !== undefined || input.currency !== undefined) {
			const current = await this.db.matter.findUnique({
				where: { id },
				select: { amount: true, currency: true },
			});

			if (!current) {
				throw new NotFoundException(`No matter with id ${id}.`);
			}

			const amount =
				input.amountCents !== undefined
					? decimalFromCents(input.amountCents)
					: current.amount;
			const currency =
				input.currency !== undefined
					? normalizeCurrency(input.currency)
					: normalizeCurrency(current.currency);

			Object.assign(data, await this.conversion.matterFields(amount, currency));
		}

		try {
			return await this.db.$transaction(async (tx) => {
				if (input.fields) {
					await this.fields.applyValues(tx, "MATTER", id, input.fields);
				}

				if (input.serviceType !== undefined) {
					await this.backfillChecklist(tx, id, input.serviceType);
				}

				return tx.matter.update({
					where: { id },
					data,
					select: { id: true, name: true },
				});
			});
		} catch (error) {
			throw this.translate(error, id);
		}
	}

	private async backfillChecklist(
		tx: Prisma.TransactionClient,
		matterId: string,
		serviceType: MatterServiceId,
	): Promise<void> {
		const template = checklistTemplateFor(serviceType);
		if (template.length === 0) return;

		const existing = await tx.documentChecklistItem.count({
			where: { matterId },
		});
		if (existing > 0) return;

		await tx.documentChecklistItem.createMany({
			data: template.map((item, index) => ({
				matterId,
				label: item.label,
				description: item.description ?? null,
				required: item.required,
				position: index,
				templateKey: item.key,
			})),
		});

		this.logger.log({
			message: "Document checklist backfilled after service change",
			matterId,
			serviceType,
		});
	}

	async archive(id: string): Promise<{ id: string; name: string }> {
		try {
			const matter = await this.db.matter.update({
				where: { id },
				data: { archivedAt: new Date() },
				select: { name: true },
			});

			this.logger.log({ message: "Matter archived", matterId: id });

			return { id, name: matter.name };
		} catch (error) {
			throw this.translate(error, id);
		}
	}

	async restore(id: string): Promise<{ id: string; name: string }> {
		try {
			const matter = await this.db.matter.update({
				where: { id },
				data: { archivedAt: null },
				select: { name: true },
			});

			this.logger.log({ message: "Matter restored", matterId: id });

			return { id, name: matter.name };
		} catch (error) {
			throw this.translate(error, id);
		}
	}

	async purge(id: string): Promise<{ id: string; name: string }>;
	async purge(
		id: string,
		guard: { archivedBefore: Date },
	): Promise<{ id: string; name: string } | null>;
	async purge(
		id: string,
		guard?: { archivedBefore: Date },
	): Promise<{ id: string; name: string } | null> {
		const blobUrls = await this.documentChecklist.blobUrlsForMatters([id]);

		let deleted: { targets: StampTargets; name: string } | null;

		try {
			deleted = await this.db.$transaction(async (tx) => {
				const [row] = await tx.$queryRaw<Array<{ archivedAt: Date | null }>>`
					SELECT "archivedAt" FROM matter WHERE id = ${id} FOR UPDATE
				`;

				if (!row) {
					if (guard) return null;
					throw new NotFoundException(`No matter with id ${id}.`);
				}
				if (
					guard &&
					(!row.archivedAt || row.archivedAt > guard.archivedBefore)
				) {
					return null;
				}

				const targets = await this.stamp.targetsOf({ matterId: id }, tx);
				await tx.agentTask.deleteMany({ where: { matterId: id } });

				const matter = await tx.matter.delete({
					where: { id },
					select: { name: true },
				});

				return { targets, name: matter.name };
			});
		} catch (error) {
			throw this.translate(error, id);
		}

		if (!deleted) return null;

		await this.stamp.recomputeAfterDelete(deleted.targets, { matterId: id });
		await deleteDocuments(blobUrls);

		this.logger.log({
			message: "Matter purged",
			matterId: id,
			name: deleted.name,
		});

		return { id, name: deleted.name };
	}

	async purgeExpired(before: Date): Promise<BulkResult> {
		const expired = await this.db.matter.findMany({
			where: { archivedAt: { lte: before } },
			select: { id: true },
			take: ARCHIVE.prune.maxBatch,
		});

		return runBulk(
			expired.map((row) => row.id),
			(id) => this.purge(id, { archivedBefore: before }),
		);
	}

	async setStage(input: SetStageInput, actingUserId: string) {
		const closedReason = input.closedReason?.trim();
		const closed = isClosedStage(input.stage);
		const transition = await this.agent.withCrmEvents(async (tx, emit) => {
			const [matter] = await tx.$queryRaw<
				Array<{ id: string; stage: MatterStage; companyId: string }>
			>`
				SELECT id, stage, "companyId"
				FROM matter
				WHERE id = ${input.id}
				FOR UPDATE
			`;

			if (!matter) {
				throw new NotFoundException(`No matter with id ${input.id}.`);
			}

			if (matter.stage === input.stage) {
				return {
					changed: false as const,
					matter,
					updated: { id: matter.id, stage: matter.stage },
					now: null,
				};
			}
			if (LOSING.has(input.stage) && !closedReason) {
				throw new BadRequestException(
					"Say why it was lost — a closed-lost matter with no reason teaches nobody anything.",
				);
			}

			const now = new Date();
			const updated = await tx.matter.update({
				where: { id: input.id },
				data: {
					stage: input.stage,
					stageChangedAt: now,
					closedAt: closed ? now : null,
					closedReason: closed ? (closedReason ?? null) : null,
				},
				select: { id: true, stage: true },
			});
			await tx.activity.create({
				data: {
					type: ActivityType.STAGE_CHANGE,
					subject: "Stage changed",
					body: closedReason ?? null,
					occurredAt: now,
					companyId: matter.companyId,
					matterId: matter.id,
					createdById: actingUserId,
					meta: { from: matter.stage, to: input.stage },
				},
			});
			await emit({
				type: "matter.stage.changed",
				record: { kind: "matter", id: matter.id },
				occurredAt: now,
				data: {
					companyId: matter.companyId,
					from: matter.stage,
					to: input.stage,
				},
			});
			if (!isClosedStage(matter.stage) && closed) {
				await emit({
					type: "matter.closed",
					record: { kind: "matter", id: matter.id },
					occurredAt: now,
					data: {
						companyId: matter.companyId,
						from: matter.stage,
						to: input.stage,
					},
				});
			}
			if (isClosedStage(matter.stage) && !closed) {
				await emit({
					type: "matter.opened",
					record: { kind: "matter", id: matter.id },
					occurredAt: now,
					data: {
						companyId: matter.companyId,
						from: matter.stage,
						to: input.stage,
					},
				});
			}

			return { changed: true as const, matter, updated, now };
		});

		if (!transition.changed) {
			return { ...transition.updated, changed: false };
		}

		const { matter, updated, now } = transition;

		await this.stamp.touch(
			{ companyId: matter.companyId, matterId: matter.id },
			now,
		);

		this.logger.log({
			message: "Matter stage changed",
			matterId: matter.id,
			from: matter.stage,
			to: input.stage,
		});

		return { ...updated, changed: true };
	}

	async contactOptions(matterId: string) {
		const matter = await this.db.matter.findUnique({
			where: { id: matterId },
			select: { companyId: true, contacts: { select: { contactId: true } } },
		});

		if (!matter) {
			throw new NotFoundException(`No matter with id ${matterId}.`);
		}

		return this.db.contact.findMany({
			where: {
				companyId: matter.companyId,
				id: { notIn: matter.contacts.map((row) => row.contactId) },
			},
			select: CONTACT_SELECT,
			orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
			take: 100,
		});
	}

	async attachContact(input: MatterAttachContactInput) {
		const company = await this.companyOf(input.matterId);
		const contact = await this.db.contact.findUnique({
			where: { id: input.contactId },
			select: { companyId: true },
		});

		if (!contact) {
			throw new NotFoundException(`No contact with id ${input.contactId}.`);
		}

		if (contact.companyId !== company.id) {
			throw new BadRequestException(
				`That contact does not work at ${company.name}.`,
			);
		}

		const role = roleOrNull(input.role ?? null);

		await this.db.matterContact.upsert({
			where: {
				matterId_contactId: {
					matterId: input.matterId,
					contactId: input.contactId,
				},
			},
			create: { matterId: input.matterId, contactId: input.contactId, role },
			update: role === null ? {} : { role },
		});

		this.logger.log({
			message: "Contact attached to matter",
			matterId: input.matterId,
			contactId: input.contactId,
		});

		return { matterId: input.matterId, contactId: input.contactId };
	}

	async detachContact(input: MatterDetachContactInput) {
		const { count } = await this.db.matterContact.deleteMany({
			where: { matterId: input.matterId, contactId: input.contactId },
		});

		if (count === 0) {
			throw new NotFoundException("That contact is not on this matter.");
		}

		this.logger.log({
			message: "Contact detached from matter",
			matterId: input.matterId,
			contactId: input.contactId,
		});

		return { matterId: input.matterId, contactId: input.contactId };
	}

	async setContactRole(input: MatterContactRoleInput) {
		const role = roleOrNull(input.role);

		const { count } = await this.db.matterContact.updateMany({
			where: { matterId: input.matterId, contactId: input.contactId },
			data: { role },
		});

		if (count === 0) {
			throw new NotFoundException("That contact is not on this matter.");
		}

		return { matterId: input.matterId, contactId: input.contactId, role };
	}

	async bulkAssignOwner(input: MatterBulkOwnerInput): Promise<BulkResult> {
		await requireOwner(this.db, input.ownerId);

		const ids = [...new Set(input.ids)];
		const { count } = await this.db.matter.updateMany({
			where: { id: { in: ids } },
			data: { ownerId: input.ownerId },
		});

		this.logger.log({
			message: "Matters reassigned",
			count,
			ownerId: input.ownerId,
		});

		return {
			requested: ids.length,
			succeeded: count,
			skipped: 0,
			failed: ids.length - count,
			message: null,
		};
	}

	async bulkSetStage(
		input: MatterBulkStageInput,
		actingUserId: string,
	): Promise<BulkResult> {
		const closedReason = input.closedReason?.trim();

		if (LOSING.has(input.stage) && !closedReason) {
			throw new BadRequestException(
				"Say why they were lost — a closed-lost matter with no reason teaches nobody anything.",
			);
		}

		return runBulk(input.ids, (id) =>
			this.setStage({ id, stage: input.stage, closedReason }, actingUserId),
		);
	}

	async bulkArchive(ids: string[]): Promise<BulkResult> {
		return runBulk(ids, (id) => this.archive(id));
	}

	async bulkRestore(ids: string[]): Promise<BulkResult> {
		return runBulk(ids, (id) => this.restore(id));
	}

	async bulkPurge(ids: string[]): Promise<BulkResult> {
		return runBulk(ids, (id) => this.purge(id));
	}

	private async companyOf(matterId: string) {
		const matter = await this.db.matter.findUnique({
			where: { id: matterId },
			select: { company: { select: { id: true, name: true } } },
		});

		if (!matter) {
			throw new NotFoundException(`No matter with id ${matterId}.`);
		}

		return matter.company;
	}

	private searchFilter(q: string): Prisma.MatterWhereInput {
		const term = q.trim();
		if (!term) return {};

		return {
			OR: [
				{ name: { contains: term, mode: "insensitive" } },
				{ company: { name: { contains: term, mode: "insensitive" } } },
			],
		};
	}

	private buildWhere(
		input: MatterListInput,
		filterableFields: FieldDefinitionWithOptions[],
	): Prisma.MatterWhereInput {
		const and: Prisma.MatterWhereInput[] = [
			this.searchFilter(input.q),
			archivedFilter(input.archived),
			...this.fields.fieldFilters(filterableFields, input.fields),
		];

		const owner = ownerFilter<Prisma.MatterWhereInput>(input.owner);
		if (owner) and.push(owner);

		if (input.status === "open") {
			and.push({ stage: { in: [...OPEN_MATTER_STAGES] } });
		} else if (input.status === "closed") {
			and.push({ stage: { in: [...CLOSED_MATTER_STAGES] } });
		}

		if (input.stage.length > 0) {
			and.push({ stage: { in: input.stage as MatterStage[] } });
		}

		if (input.closing.length > 0) {
			and.push({
				OR: input.closing.map((window) =>
					closingFilter(window as ClosingWindow),
				),
			});
		}

		return { AND: and };
	}

	private async facetCounts(
		input: MatterListInput,
		filterableFields: FieldDefinitionWithOptions[],
	) {
		const where: Prisma.MatterWhereInput = {
			AND: [this.searchFilter(input.q), archivedFilter(input.archived)],
		};

		const [owners, stages, fieldFacets, ...closingCounts] = await Promise.all([
			this.db.matter.groupBy({
				by: ["ownerId"],
				where,
				_count: { _all: true },
			}),
			this.db.matter.groupBy({ by: ["stage"], where, _count: { _all: true } }),
			this.fields.filterFacetCounts("MATTER", where, filterableFields),
			...CLOSING_WINDOWS.map((window) =>
				this.db.matter.count({
					where: { AND: [where, closingFilter(window)] },
				}),
			),
		]);

		const stageCounts = countsByKey(stages, "stage");
		const openCount = OPEN_MATTER_STAGES.reduce(
			(total, stage) => total + (stageCounts[stage] ?? 0),
			0,
		);
		const closedCount = CLOSED_MATTER_STAGES.reduce(
			(total, stage) => total + (stageCounts[stage] ?? 0),
			0,
		);

		return {
			status: { open: openCount, closed: closedCount },
			owner: countsByKey(owners, "ownerId", FACET_UNASSIGNED),
			stage: stageCounts,
			closing: Object.fromEntries(
				CLOSING_WINDOWS.map((window, index) => [
					window,
					closingCounts[index] ?? 0,
				]),
			),
			...Object.fromEntries(
				Object.entries(fieldFacets).map(([key, counts]) => [
					`field:${key}`,
					counts,
				]),
			),
		};
	}

	private translate(cause: unknown, id: string): never {
		if (
			cause instanceof PrismaNamespace.PrismaClientKnownRequestError &&
			cause.code === "P2025"
		) {
			throw new NotFoundException(`No matter with id ${id}.`);
		}
		return this.translateRelations(cause);
	}

	private translateRelations(cause: unknown): never {
		if (
			cause instanceof PrismaNamespace.PrismaClientKnownRequestError &&
			(cause.code === "P2003" || cause.code === "P2025")
		) {
			throw new BadRequestException(
				"That company or owner does not exist any more.",
			);
		}
		throw cause;
	}
}

function closingFilter(window: ClosingWindow): Prisma.MatterWhereInput {
	const now = new Date();
	const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
	const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
	const startOfMonthAfter = new Date(now.getFullYear(), now.getMonth() + 2, 1);

	switch (window) {
		case "overdue":
			return {
				expectedCloseDate: { lt: now },
				stage: { in: [...OPEN_MATTER_STAGES] },
			};
		case "this-month":
			return {
				expectedCloseDate: { gte: startOfMonth, lt: startOfNextMonth },
			};
		case "next-month":
			return {
				expectedCloseDate: { gte: startOfNextMonth, lt: startOfMonthAfter },
			};
		case "later":
			return { expectedCloseDate: { gte: startOfMonthAfter } };
		case "none":
			return { expectedCloseDate: null };
	}
}

function roleOrNull(value: string | null): string | null {
	return value === null ? null : blankToNull(value);
}

function parseDate(value: string | null | undefined): Date | null {
	if (value === null || value === undefined || value === "") return null;
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		throw new BadRequestException(`"${value}" is not a date.`);
	}
	return date;
}
