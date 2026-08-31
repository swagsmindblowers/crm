import { Badge } from "@crm/ui/components/badge";
import type { ClientMatterStatus } from "@/lib/portal-matters";

const VARIANT_FOR_STATUS = {
	in_progress: "secondary",
	submitted: "secondary",
	decision_pending: "secondary",
	approved: "default",
	not_approved: "destructive",
	withdrawn: "destructive",
} satisfies Record<ClientMatterStatus, "default" | "secondary" | "destructive">;

export function PortalStatusBadge({
	status,
	label,
}: {
	status: ClientMatterStatus;
	label: string;
}) {
	return <Badge variant={VARIANT_FOR_STATUS[status]}>{label}</Badge>;
}
