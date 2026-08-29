import Warning from "@carbon/icons-react/es/Warning";
import {
	Alert,
	AlertDescription,
	AlertTitle,
} from "@crm/ui/components/alert";
import { Badge } from "@crm/ui/components/badge";
import { EmptyCellValue } from "@crm/ui/components/empty-cell";
import { SimpleTable, SimpleTableRow } from "@crm/ui/components/simple-table";
import { TableCell } from "@crm/ui/components/table";
import { Suspense } from "react";
import { LocalDateTime } from "@/components/local-date-time";
import { requireSession } from "@/lib/session";
import { getServerQueryClient, getServerTrpc } from "@/lib/trpc/server";
import { ConnectionPage, ConnectionPageLoading } from "../connection-page";

const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
	month: "short",
	day: "numeric",
	hour: "numeric",
	minute: "2-digit",
};

const SUBMISSION_COLUMNS = [
	{ id: "email", header: "Applicant", width: "w-[40%]", className: "pl-5" },
	{ id: "status", header: "Status", width: "w-[30%]" },
	{ id: "receivedAt", header: "Received", width: "w-[30%]" },
];

export default function IntakeConnectionPage(
	props: PageProps<"/[slug]/settings/connections/intake">,
) {
	return (
		<Suspense fallback={<ConnectionPageLoading />}>
			<IntakeConnectionPageContent {...props} />
		</Suspense>
	);
}

async function IntakeConnectionPageContent({}: PageProps<"/[slug]/settings/connections/intake">) {
	await requireSession();

	const queryClient = getServerQueryClient();
	const status = await queryClient.fetchQuery(
		getServerTrpc().intake.status.queryOptions(),
	);

	return (
		<ConnectionPage centered className="max-w-(--container-page)">
			<header className="flex flex-col gap-3 px-(--spacing-block-inline)">
				<div className="flex items-center gap-3">
					<h1 className="font-medium text-xl">Intake endpoint</h1>
					<span className="ml-auto text-muted-foreground text-sm">
						{status.configured ? "Configured" : "Not configured"}
					</span>
				</div>
				<p className="text-muted-foreground text-sm leading-relaxed">
					Sends: nothing. Brings in: form submissions. Point a Power Automate
					flow on your Microsoft Form at this endpoint and every response
					becomes a Contact and a Matter, with its document checklist seeded
					from the service it names.
				</p>
			</header>

			{status.configured ? null : (
				<Alert variant="warning">
					<Warning />
					<AlertTitle>INTAKE_SHARED_SECRET is not set</AlertTitle>
					<AlertDescription>
						The endpoint refuses every request until this is set in the
						environment. Generate a long random value, set{" "}
						<code>INTAKE_SHARED_SECRET</code> in your <code>.env</code>, and
						configure the same value as a header in the Power Automate flow.
					</AlertDescription>
				</Alert>
			)}

			<div className="flex flex-col gap-2 border-y px-(--spacing-block-inline) py-5 text-sm">
				<div className="flex items-center gap-2">
					<span className="text-muted-foreground">Endpoint</span>
					<code className="rounded-sm bg-muted px-1.5 py-0.5">
						POST {status.endpointPath}
					</code>
				</div>
				<div className="flex items-center gap-2">
					<span className="text-muted-foreground">Auth header</span>
					<code className="rounded-sm bg-muted px-1.5 py-0.5">
						X-Intake-Secret: &lt;INTAKE_SHARED_SECRET&gt;
					</code>
				</div>
				<p className="text-muted-foreground text-xs leading-relaxed">
					Body: <code>formId</code>, <code>applicant.firstName</code>,{" "}
					<code>applicant.lastName</code>, <code>applicant.email</code>,{" "}
					<code>applicant.phone</code>, <code>serviceType</code> (matched
					against the fee schedule, falling back to Other), and a{" "}
					<code>fields</code> object for anything else the form captured.
				</p>
			</div>

			<div className="flex flex-col gap-2 px-(--spacing-block-inline)">
				<h2 className="font-medium text-sm">Recent submissions</h2>
				{status.recent.length === 0 ? (
					<p className="text-muted-foreground text-sm">
						Nothing has come through yet.
					</p>
				) : (
					<SimpleTable variant="panel" columns={SUBMISSION_COLUMNS}>
						{status.recent.map((row) => (
							<SimpleTableRow key={row.id}>
								<TableCell className="truncate py-2.5 pr-3 pl-5">
									{row.email ?? <EmptyCellValue />}
								</TableCell>
								<TableCell className="truncate px-3 py-2.5">
									{row.filedAt ? (
										<Badge variant="outline">Filed</Badge>
									) : (
										<span className="text-muted-foreground">
											{row.skipReason ?? "Skipped"}
										</span>
									)}
								</TableCell>
								<TableCell className="truncate px-3 py-2.5 text-muted-foreground">
									<LocalDateTime date={row.createdAt} options={DATE_OPTIONS} />
								</TableCell>
							</SimpleTableRow>
						))}
					</SimpleTable>
				)}
			</div>
		</ConnectionPage>
	);
}
