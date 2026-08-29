import { MatterStage } from "./generated/prisma/enums";

export const OPEN_MATTER_STAGES = [
	MatterStage.ENQUIRY,
	MatterStage.INSTRUCTED,
	MatterStage.PREPARING_APPLICATION,
	MatterStage.SUBMITTED,
	MatterStage.AWAITING_DECISION,
] as const;

export const CLOSED_MATTER_STAGES = [
	MatterStage.GRANTED,
	MatterStage.REFUSED,
	MatterStage.WITHDRAWN,
] as const;

export const LOSING_MATTER_STAGES = [
	MatterStage.REFUSED,
	MatterStage.WITHDRAWN,
] as const;

const CLOSED = new Set<MatterStage>(CLOSED_MATTER_STAGES);

export function isClosedStage(stage: MatterStage): boolean {
	return CLOSED.has(stage);
}
