import type { MatterStage } from "@crm/db/enums";
import { StatusIndicator } from "@crm/ui/components/status-indicator";
import { matterStagePresentation } from "@/lib/matter-stage";

export function MatterStageIndicator({
	stage,
	className,
}: {
	stage: MatterStage;
	className?: string;
}) {
	const { label, tone } = matterStagePresentation(stage);
	return <StatusIndicator tone={tone} label={label} className={className} />;
}
