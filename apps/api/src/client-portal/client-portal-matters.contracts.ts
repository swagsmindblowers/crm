import { CLIENT_MATTER_STATUS } from "@crm/validation/client-portal-status";
import { z } from "zod";

const clientMatterStatus = z.enum(CLIENT_MATTER_STATUS);

export const portalMatterListOutput = z.object({
	matters: z.array(
		z.object({
			id: z.string(),
			name: z.string(),
			companyName: z.string(),
			status: clientMatterStatus,
			statusLabel: z.string(),
		}),
	),
});

export type PortalMatterList = z.infer<typeof portalMatterListOutput>;

export const portalChecklistItemOutput = z.object({
	id: z.string(),
	label: z.string(),
	description: z.string().nullable(),
	required: z.boolean(),
	status: z.enum(["outstanding", "received"]),
	uploads: z.array(
		z.object({
			id: z.string(),
			filename: z.string(),
			reviewStatus: z.enum(["PENDING_REVIEW", "ACCEPTED", "REJECTED"]),
			reviewNote: z.string().nullable(),
			createdAt: z.string(),
		}),
	),
});

export const portalMatterDetailOutput = z.object({
	id: z.string(),
	name: z.string(),
	companyName: z.string(),
	status: clientMatterStatus,
	statusLabel: z.string(),
	checklist: z.array(portalChecklistItemOutput),
});

export type PortalMatterDetail = z.infer<typeof portalMatterDetailOutput>;
