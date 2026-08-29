"use client";

import { EmptyCellValue } from "@crm/ui/components/empty-cell";
import {
	SimpleTable,
	type SimpleTableColumn,
	SimpleTableRow,
} from "@crm/ui/components/simple-table";
import { TableCell } from "@crm/ui/components/table";
import { formatMoney } from "@crm/ui/lib/format";
import { CompanyCell } from "@/components/crm/company-cell";
import { MatterStageIndicator } from "@/components/crm/matter-stage";
import { OwnerCell } from "@/components/crm/owner-cell";
import { usePrefetchRecord } from "@/components/crm/record-sheet/record-prefetch";
import { useOpenRecord } from "@/components/crm/record-sheet/record-stack";
import { LocalDay } from "@/components/local-date-time";
import type { MatterListItem, MatterListResult } from "@/lib/agent-transcript";
import { MATTER_STAGE_OPTIONS } from "@/lib/matter-stage";

const COLUMNS: SimpleTableColumn[] = [
	{ id: "matter", header: "Matter", width: "w-[20%]" },
	{ id: "company", header: "Company", width: "w-[18%]" },
	{ id: "stage", header: "Stage", width: "w-[18%]" },
	{
		id: "amount",
		header: "Amount",
		width: "w-[12%]",
		align: "right",
	},
	{ id: "owner", header: "Owner", width: "w-[14%]" },
	{ id: "close", header: "Close date", width: "w-[12%]" },
	{ id: "idle", header: "Idle", width: "w-[8%]", align: "right" },
];

export function MatterListResultTable({ result }: { result: MatterListResult }) {
	const openRecord = useOpenRecord();
	const prefetchRecord = usePrefetchRecord();
	const count = result.matters.length;
	const title = tableTitle(result);

	return (
		<section aria-label={title} className="flex w-full flex-col gap-3">
			<SimpleTable
				columns={COLUMNS}
				className="min-w-[56rem] table-fixed [&_td:first-child]:pl-4 [&_td:last-child]:pr-4 [&_th:first-child]:pl-4 [&_th:last-child]:pr-4"
				headerHeight="h-11"
			>
				{count === 0 ? (
					<SimpleTableRow>
						<TableCell
							colSpan={COLUMNS.length}
							className="h-32 whitespace-normal py-8 text-center align-middle text-muted-foreground"
						>
							No matters met these pipeline filters.
						</TableCell>
					</SimpleTableRow>
				) : (
					result.matters.map((matter) => {
						const record = { kind: "matter" as const, id: matter.id };

						return (
							<SimpleTableRow
								key={matter.id}
								clickable
								onClick={() => openRecord(record)}
								onFocus={() => prefetchRecord(record)}
								onMouseEnter={() => prefetchRecord(record)}
							>
								<TableCell className="overflow-hidden px-3 py-3">
									<span className="block truncate font-medium">
										{matter.name}
									</span>
								</TableCell>
								<TableCell className="overflow-hidden px-3 py-3">
									<CompanyCell company={matter.company} />
								</TableCell>
								<TableCell className="overflow-hidden px-3 py-3">
									<Stage stage={matter.stage} />
								</TableCell>
								<TableCell className="overflow-hidden px-3 py-3 text-right">
									{matter.amount === null ? (
										<EmptyCellValue />
									) : (
										<span className="tabular-nums">
											{formatMoney(
												Math.round(matter.amount * 100),
												matter.currency,
											)}
										</span>
									)}
								</TableCell>
								<TableCell className="overflow-hidden px-3 py-3">
									<OwnerCell owner={matter.owner} />
								</TableCell>
								<TableCell className="overflow-hidden px-3 py-3">
									{matter.expectedCloseDate ? (
										<span className="text-muted-foreground">
											<LocalDay date={matter.expectedCloseDate} />
										</span>
									) : (
										<EmptyCellValue />
									)}
								</TableCell>
								<TableCell
									className="overflow-hidden px-3 py-3 text-right text-muted-foreground tabular-nums"
									title={
										matter.neverActive
											? "No activity has ever been recorded"
											: undefined
									}
								>
									{matter.daysSinceLastActivity}d
								</TableCell>
							</SimpleTableRow>
						);
					})
				)}
			</SimpleTable>
			<div className="flex flex-wrap items-center justify-between gap-3 text-muted-foreground text-xs">
				<span>{tableMeta(result)}</span>
				<span>
					As of <LocalDay date={result.asOf} />
				</span>
			</div>
		</section>
	);
}

function Stage({ stage }: { stage: string }) {
	const option = MATTER_STAGE_OPTIONS.find(
		(candidate) => candidate.value === stage,
	);
	return option ? (
		<MatterStageIndicator stage={option.value} />
	) : (
		<span className="text-muted-foreground">{humaniseStage(stage)}</span>
	);
}

function tableTitle(result: MatterListResult): string {
	const count = result.matters.length;
	const status =
		result.criteria.status === "all" ? "" : `${result.criteria.status} `;
	const stale = result.criteria.inactiveForDays === null ? "" : "stale ";
	return count === 0
		? "No matching matters"
		: `${count} ${stale}${status}matter${count === 1 ? "" : "s"}`;
}

function tableMeta(result: MatterListResult): string {
	const details = [
		`${result.matters.length} matter${result.matters.length === 1 ? "" : "s"}`,
		pipelineTotal(result.matters),
		result.criteria.inactiveForDays === null
			? null
			: `${result.criteria.inactiveForDays}+ days inactive`,
		result.hasMore ? "More results available" : null,
	].filter((detail): detail is string => Boolean(detail));

	return details.join(" · ");
}

function humaniseStage(stage: string): string {
	return stage
		.toLowerCase()
		.split("_")
		.map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
		.join(" ");
}

function pipelineTotal(matters: readonly MatterListItem[]): string | null {
	const currencies = new Set(matters.map((matter) => matter.currency));
	if (currencies.size !== 1) return null;

	const currency = currencies.values().next().value;
	if (!currency) return null;

	const amount = matters.reduce((sum, matter) => sum + (matter.amount ?? 0), 0);
	return `${formatMoney(Math.round(amount * 100), currency)} pipeline`;
}
