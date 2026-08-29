import { MatterStage } from "@crm/db/enums";
import type { StatusTone } from "@crm/ui/components/status-indicator";

const ORDER = [
	MatterStage.ENQUIRY,
	MatterStage.INSTRUCTED,
	MatterStage.PREPARING_APPLICATION,
	MatterStage.SUBMITTED,
	MatterStage.AWAITING_DECISION,
	MatterStage.GRANTED,
	MatterStage.REFUSED,
	MatterStage.WITHDRAWN,
] as const;

type MatterStagePresentation = Record<
	MatterStage,
	{ label: string; tone: StatusTone }
>;

const PRESENTATION: MatterStagePresentation = {
	ENQUIRY: { label: "Enquiry", tone: "neutral" },
	INSTRUCTED: { label: "Instructed", tone: "info" },
	PREPARING_APPLICATION: { label: "Preparing application", tone: "info" },
	SUBMITTED: { label: "Submitted", tone: "warning" },
	AWAITING_DECISION: { label: "Awaiting decision", tone: "warning" },
	GRANTED: { label: "Granted", tone: "success" },
	REFUSED: { label: "Refused", tone: "error" },
	WITHDRAWN: { label: "Withdrawn", tone: "neutral" },
};

export const OPEN_STAGES = ORDER.slice(0, 5) as readonly MatterStage[];

export const LOSING_STAGES: readonly MatterStage[] = [
	MatterStage.REFUSED,
	MatterStage.WITHDRAWN,
];

export const MATTER_STAGE_OPTIONS = ORDER.map((value) => ({
	value,
	label: PRESENTATION[value].label,
}));

const OPEN_STAGE_COLORS = [
	"var(--chart-1)",
	"var(--chart-2)",
	"var(--chart-3)",
	"var(--chart-4)",
	"var(--chart-5)",
] as const;

export function isClosedStage(stage: MatterStage): boolean {
	return !OPEN_STAGES.includes(stage);
}

export function matterStageColor(stage: MatterStage): string {
	return OPEN_STAGE_COLORS[OPEN_STAGES.indexOf(stage)] ?? "var(--chart-5)";
}

export function matterStageLabel(stage: MatterStage): string {
	return PRESENTATION[stage].label;
}

export function matterStagePresentation(stage: MatterStage) {
	return PRESENTATION[stage];
}
