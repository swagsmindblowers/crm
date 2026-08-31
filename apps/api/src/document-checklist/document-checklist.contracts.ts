import { DocumentChecklistStatus, DocumentUploadReviewStatus } from "@crm/db";
import { z } from "zod";

const statusEnum = z.enum(
	Object.values(DocumentChecklistStatus) as [
		DocumentChecklistStatus,
		...DocumentChecklistStatus[],
	],
);

const reviewStatusEnum = z.enum(
	Object.values(DocumentUploadReviewStatus) as [
		DocumentUploadReviewStatus,
		...DocumentUploadReviewStatus[],
	],
);

export const checklistListInput = z.object({ matterId: z.string() });

export const checklistUploadOutput = z.object({
	id: z.string(),
	filename: z.string(),
	contentType: z.string(),
	byteSize: z.number(),
	url: z.string(),
	uploadedByName: z.string().nullable(),
	reviewStatus: reviewStatusEnum,
	reviewNote: z.string().nullable(),
	reviewedAt: z.string().nullable(),
	createdAt: z.string(),
});

export type ChecklistUpload = z.infer<typeof checklistUploadOutput>;

export const checklistItemOutput = z.object({
	id: z.string(),
	label: z.string(),
	description: z.string().nullable(),
	status: statusEnum,
	receivedAt: z.string().nullable(),
	required: z.boolean(),
	position: z.number(),
	uploads: z.array(checklistUploadOutput),
});

export type ChecklistItem = z.infer<typeof checklistItemOutput>;

export const checklistListOutput = z.object({
	items: z.array(checklistItemOutput),
	outstanding: z.number(),
});

export const checklistCreateInput = z.object({
	matterId: z.string(),
	label: z.string().trim().min(1, "A document needs a name.").max(160),
	description: z.string().trim().max(500).nullable().optional(),
	required: z.boolean().optional(),
});

export type ChecklistCreateInput = z.infer<typeof checklistCreateInput>;

export const checklistUpdateInput = z.object({
	id: z.string(),
	matterId: z.string(),
	label: z.string().trim().min(1).max(160).optional(),
	description: z.string().trim().max(500).nullable().optional(),
	status: statusEnum.optional(),
	required: z.boolean().optional(),
});

export type ChecklistUpdateInput = z.infer<typeof checklistUpdateInput>;

export const checklistRemoveInput = z.object({
	id: z.string(),
	matterId: z.string(),
});

export const checklistRemovedOutput = z.object({ id: z.string() });

export const checklistUploadReviewInput = z.object({
	id: z.string(),
	matterId: z.string(),
	decision: z.enum([
		DocumentUploadReviewStatus.ACCEPTED,
		DocumentUploadReviewStatus.REJECTED,
	]),
	note: z.string().trim().max(500).nullable().optional(),
});

export type ChecklistUploadReviewInput = z.infer<
	typeof checklistUploadReviewInput
>;
