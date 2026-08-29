import { MatterStage } from "@crm/db";
import { FIELD_ENTITIES, FIELD_TYPES } from "@crm/db/fields";
import { z } from "zod";
import { bulkIdsInput } from "../crm/bulk";
import { currencyCode } from "../currency/currency.contracts";
import { recordFieldValues } from "../fields/fields.contracts";
import { listInput } from "../trpc/list-input";

export const MAX_AMOUNT_CENTS = 99_999_999_999_999;

const amountCents = z
	.number()
	.int()
	.min(0)
	.max(MAX_AMOUNT_CENTS, "That amount is too large to record.")
	.nullable()
	.optional();

export const CLOSING_WINDOWS = [
	"overdue",
	"this-month",
	"next-month",
	"later",
	"none",
] as const;

export type ClosingWindow = (typeof CLOSING_WINDOWS)[number];

export const matterListInput = listInput.extend({
	status: z.string().default("all"),
	owner: z.array(z.string()).default([]),
	stage: z.array(z.string()).default([]),
	closing: z.array(z.string()).default([]),
	fields: z.record(z.string(), z.array(z.string())).default({}),
	archived: z.boolean().default(false),
});

export type MatterListInput = z.infer<typeof matterListInput>;

const stageEnum = z.enum(
	Object.values(MatterStage) as [MatterStage, ...MatterStage[]],
);

export const matterCreateInput = z.object({
	name: z.string().trim().min(1, "A matter needs a name."),
	companyId: z.string().min(1, "A matter belongs to a company."),
	ownerId: z.string().min(1, "A matter needs an owner."),
	stage: stageEnum.optional(),
	amountCents,
	currency: currencyCode.optional(),
	expectedCloseDate: z.string().nullable().optional(),
});

export type MatterCreateInput = z.infer<typeof matterCreateInput>;

const matterUpdateInput = z.object({
	name: z.string().trim().min(1).optional(),
	description: z.string().nullable().optional(),
	companyId: z.string().optional(),
	ownerId: z.string().optional(),
	amountCents,
	currency: currencyCode.optional(),
	expectedCloseDate: z.string().nullable().optional(),
	fields: recordFieldValues.optional(),
});

export type MatterUpdateInput = z.infer<typeof matterUpdateInput>;

export const matterUpdateArgs = z.object({
	id: z.string(),
	data: matterUpdateInput,
});

export const matterIdInput = z.object({ id: z.string() });

export const setStageInput = z.object({
	id: z.string(),
	stage: stageEnum,
	closedReason: z.string().trim().optional(),
});

export type SetStageInput = z.infer<typeof setStageInput>;

const matterContactRole = z
	.string()
	.trim()
	.max(80, "That role is too long.")
	.nullable();

export const matterContactsInput = z.object({ matterId: z.string() });

export const matterAttachContactInput = z.object({
	matterId: z.string(),
	contactId: z.string().min(1, "Choose somebody to bring onto the matter."),
	role: matterContactRole.optional(),
});

export type MatterAttachContactInput = z.infer<typeof matterAttachContactInput>;

export const matterDetachContactInput = z.object({
	matterId: z.string(),
	contactId: z.string(),
});

export type MatterDetachContactInput = z.infer<typeof matterDetachContactInput>;

export const matterContactRoleInput = z.object({
	matterId: z.string(),
	contactId: z.string(),
	role: matterContactRole,
});

export type MatterContactRoleInput = z.infer<typeof matterContactRoleInput>;

export const matterBulkInput = bulkIdsInput;

export const matterBulkOwnerInput = bulkIdsInput.extend({
	ownerId: z.string().min(1, "A matter needs an owner."),
});

export type MatterBulkOwnerInput = z.infer<typeof matterBulkOwnerInput>;

export const matterBulkStageInput = bulkIdsInput.extend({
	stage: stageEnum,
	closedReason: z.string().trim().optional(),
});

export type MatterBulkStageInput = z.infer<typeof matterBulkStageInput>;

const fieldValueOutput = z.union([
	z.string(),
	z.number(),
	z.boolean(),
	z.null(),
]);

const fieldOptionOutput = z.object({
	id: z.string(),
	label: z.string(),
	position: z.number(),
});

const recordFieldOutput = z.object({
	id: z.string(),
	entity: z.enum(FIELD_ENTITIES),
	key: z.string(),
	label: z.string(),
	type: z.enum(FIELD_TYPES),
	typeLabel: z.string(),
	agentFilled: z.boolean(),
	agentBrief: z.string().nullable(),
	required: z.boolean(),
	showOnSheet: z.boolean(),
	showOnTable: z.boolean(),
	showOnFilter: z.boolean(),
	position: z.number(),
	archived: z.boolean(),
	options: z.array(fieldOptionOutput),
	value: fieldValueOutput,
});

const matterOwnerOutput = z.object({
	id: z.string(),
	name: z.string(),
	email: z.string(),
	image: z.string().nullable(),
});

const matterCompanyOutput = z.object({
	id: z.string(),
	name: z.string(),
	domain: z.string().nullable(),
	iconUrl: z.string().nullable(),
	iconDarkUrl: z.string().nullable(),
	iconTone: z.string().nullable(),
	logoUrl: z.string().nullable(),
});

const matterCompanyDetailOutput = matterCompanyOutput.extend({
	industry: z.string().nullable(),
});

const matterContactSummaryOutput = z.object({
	id: z.string(),
	firstName: z.string(),
	lastName: z.string().nullable(),
	email: z.string().nullable(),
	title: z.string().nullable(),
	imageUrl: z.string().nullable(),
});

const matterContactOutput = matterContactSummaryOutput.extend({
	role: z.string().nullable(),
});

const matterListRowOutput = z.object({
	id: z.string(),
	name: z.string(),
	stage: stageEnum,
	currency: z.string(),
	company: matterCompanyOutput,
	owner: matterOwnerOutput,
	amountCents: z.number().nullable(),
	baseAmountCents: z.number().nullable(),
	expectedCloseDate: z.string().nullable(),
	closedAt: z.string().nullable(),
	lastActivityAt: z.string().nullable(),
	createdAt: z.string(),
	archivedAt: z.string().nullable(),
	fields: z.record(z.string(), fieldValueOutput),
});

export const matterListOutput = z.object({
	rows: z.array(matterListRowOutput),
	total: z.number(),
	facetCounts: z.record(z.string(), z.record(z.string(), z.number())),
	openValueCents: z.number().nullable(),
	reportingCurrency: z.string(),
	unconverted: z.object({
		count: z.number(),
		currencies: z.array(z.string()),
	}),
});

export type MatterListResult = z.infer<typeof matterListOutput>;

export const matterDetailOutput = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().nullable(),
	stage: stageEnum,
	currency: z.string(),
	closedReason: z.string().nullable(),
	company: matterCompanyDetailOutput,
	owner: matterOwnerOutput,
	fields: z.array(recordFieldOutput),
	amountCents: z.number().nullable(),
	baseAmountCents: z.number().nullable(),
	reportingCurrency: z.string(),
	fxRate: z.number().nullable(),
	fxRateAt: z.string().nullable(),
	stageChangedAt: z.string(),
	expectedCloseDate: z.string().nullable(),
	closedAt: z.string().nullable(),
	createdAt: z.string(),
	archivedAt: z.string().nullable(),
	contacts: z.array(matterContactOutput),
});

export type MatterDetail = z.infer<typeof matterDetailOutput>;

export const matterCreateOutput = z.object({
	id: z.string(),
	name: z.string(),
	companyId: z.string(),
});

export type MatterCreated = z.infer<typeof matterCreateOutput>;

export const matterMutateOutput = z.object({
	id: z.string(),
	name: z.string(),
});

export type MatterMutated = z.infer<typeof matterMutateOutput>;

export const matterSetStageOutput = z.object({
	id: z.string(),
	stage: stageEnum,
	changed: z.boolean(),
});

export type MatterSetStageResult = z.infer<typeof matterSetStageOutput>;

export const matterContactOptionsOutput = z.array(matterContactSummaryOutput);

export type MatterContactOption = z.infer<typeof matterContactSummaryOutput>;

export const matterContactLinkOutput = z.object({
	matterId: z.string(),
	contactId: z.string(),
});

export type MatterContactLink = z.infer<typeof matterContactLinkOutput>;

export const matterContactRoleOutput = z.object({
	matterId: z.string(),
	contactId: z.string(),
	role: z.string().nullable(),
});

export type MatterContactRoleResult = z.infer<typeof matterContactRoleOutput>;

export const matterBulkResultOutput = z.object({
	requested: z.number(),
	succeeded: z.number(),
	failed: z.number(),
	message: z.string().nullable(),
});

export type MatterBulkResult = z.infer<typeof matterBulkResultOutput>;
