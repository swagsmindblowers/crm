import { ConflictCheckStatus } from "@crm/db";
import { z } from "zod";

const statusEnum = z.enum(
	Object.values(ConflictCheckStatus) as [
		ConflictCheckStatus,
		...ConflictCheckStatus[],
	],
);

export const conflictMatchOutput = z.object({
	kind: z.enum(["contact", "matter"]),
	id: z.string(),
	label: z.string(),
	matchedOn: z.enum(["name", "employer", "relatedParty"]),
	detail: z.string(),
});

export const conflictCheckOutput = z.object({
	id: z.string(),
	status: statusEnum,
	matches: z.array(conflictMatchOutput),
	checkedAt: z.string(),
	dismissedAt: z.string().nullable(),
	dismissedNote: z.string().nullable(),
});

export type ConflictCheckRow = z.infer<typeof conflictCheckOutput>;

export const conflictListInput = z
	.object({
		matterId: z.string().optional(),
		contactId: z.string().optional(),
	})
	.refine((value) => value.matterId || value.contactId, {
		message: "Name a matter or a contact.",
	});

export const conflictListOutput = z.object({
	checks: z.array(conflictCheckOutput),
});

export const conflictRunInput = z
	.object({
		matterId: z.string().optional(),
		contactId: z.string().optional(),
	})
	.refine((value) => value.matterId || value.contactId, {
		message: "Name a matter or a contact.",
	});

export const conflictRunOutput = z.object({ queued: z.boolean() });

export const conflictDismissInput = z.object({
	id: z.string(),
	note: z.string().trim().min(1, "Say why this is not a conflict.").max(500),
});
