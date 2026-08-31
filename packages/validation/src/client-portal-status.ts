import { MatterStage } from "@crm/db/enums";

export const CLIENT_MATTER_STATUS = [
	"in_progress",
	"submitted",
	"decision_pending",
	"approved",
	"not_approved",
	"withdrawn",
] as const;

export type ClientMatterStatus = (typeof CLIENT_MATTER_STATUS)[number];

const STATUS_FOR_STAGE = {
	ENQUIRY: "in_progress",
	INSTRUCTED: "in_progress",
	PREPARING_APPLICATION: "in_progress",
	SUBMITTED: "submitted",
	AWAITING_DECISION: "decision_pending",
	GRANTED: "approved",
	REFUSED: "not_approved",
	WITHDRAWN: "withdrawn",
} satisfies Record<MatterStage, ClientMatterStatus>;

export const CLIENT_MATTER_STATUS_LABEL = {
	in_progress: "In progress",
	submitted: "Submitted",
	decision_pending: "Decision pending",
	approved: "Approved",
	not_approved: "Not approved",
	withdrawn: "Withdrawn",
} satisfies Record<ClientMatterStatus, string>;

export function clientMatterStatusFor(stage: MatterStage): ClientMatterStatus {
	return STATUS_FOR_STAGE[stage];
}

export function clientMatterStatusLabel(stage: MatterStage): string {
	return CLIENT_MATTER_STATUS_LABEL[clientMatterStatusFor(stage)];
}
