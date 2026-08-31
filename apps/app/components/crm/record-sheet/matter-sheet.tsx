"use client";

import Add from "@carbon/icons-react/es/Add";
import Close from "@carbon/icons-react/es/Close";
import DocumentBlank from "@carbon/icons-react/es/DocumentBlank";
import UserMultiple from "@carbon/icons-react/es/UserMultiple";
import WarningAlt from "@carbon/icons-react/es/WarningAlt";
import { CURRENCIES, normalizeCurrency } from "@crm/db/currency";
import type { FieldValueJson } from "@crm/db/fields";
import { Alert, AlertDescription, AlertTitle } from "@crm/ui/components/alert";
import { Button } from "@crm/ui/components/button";
import { Checkbox } from "@crm/ui/components/checkbox";
import { EmptyCellValue } from "@crm/ui/components/empty-cell";
import {
	EntityLogo,
	type EntityLogoTone,
} from "@crm/ui/components/entity-logo";
import { Icon } from "@crm/ui/components/icon";
import { Input } from "@crm/ui/components/input";
import { PersonAvatar } from "@crm/ui/components/person-avatar";
import { SimpleTable, SimpleTableRow } from "@crm/ui/components/simple-table";
import { TableCell } from "@crm/ui/components/table";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@crm/ui/components/tooltip";
import { formatMoney } from "@crm/ui/lib/format";
import {
	MATTER_SERVICES,
	serviceDefaultFeeCents,
	serviceLabel,
} from "@crm/validation/matter-services";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AgentPanel } from "@/components/crm/agent-panel";
import { InlineCompanyField } from "@/components/crm/company-picker";
import { contactName } from "@/components/crm/contact-name";
import { FieldsCog, RecordFields } from "@/components/crm/fields/record-fields";
import {
	InlineDateField,
	InlineField,
	InlineSelectField,
	InlineTextArea,
	InlineTextCell,
	savingValue,
} from "@/components/crm/inline-field";
import { OwnerCell } from "@/components/crm/owner-cell";
import { MatterStageMenu } from "@/components/crm/stage-change";
import { StageStepper } from "@/components/crm/stage-stepper";
import { Timeline } from "@/components/crm/timeline/timeline";
import {
	DetailSheetBody,
	DetailSheetEmpty,
	DetailSheetProperties,
	DetailSheetProperty,
	DetailSheetSection,
	DetailSheetStat,
	DetailSheetStats,
	type DetailSheetTab,
} from "@/components/detail-sheet";
import {
	LocalDateTime,
	LocalDay,
	LocalRelativeTime,
} from "@/components/local-date-time";
import { savingField } from "@/lib/pending-field";
import { useCrmCache } from "@/lib/trpc/cache";
import { useTRPC } from "@/lib/trpc/client";
import type { RouterOutputs } from "@/lib/trpc/types";
import { AttachMatterContact } from "./quick-add";
import { RecordActions } from "./record-actions";
import { AddRow, RecordSheetFrame } from "./record-parts";
import { useOpenRecord, useRecordSheetView } from "./record-stack";

type Matter = RouterOutputs["matters"]["byId"];

const CURRENCY_OPTIONS = CURRENCIES.map((entry) => ({
	value: entry.code,
	label: `${entry.code} · ${entry.name}`,
}));

function matterCurrency(currency: string) {
	return normalizeCurrency(currency) || currency;
}

function currencyOptions(currency: string) {
	if (CURRENCY_OPTIONS.some((option) => option.value === currency)) {
		return CURRENCY_OPTIONS;
	}

	return [
		{ value: currency, label: `${currency} — no longer supported` },
		...CURRENCY_OPTIONS,
	];
}

function ReportedValue({ matter }: { matter: Matter }) {
	const currency = matterCurrency(matter.currency);

	if (currency === matter.reportingCurrency) return null;
	if (matter.amountCents === null) return null;

	return (
		<DetailSheetProperty label={`In ${matter.reportingCurrency}`}>
			{matter.baseAmountCents === null ? (
				<span className="text-muted-foreground">
					No {currency} rate — left out of totals
				</span>
			) : (
				<span className="tabular-nums text-muted-foreground">
					≈ {formatMoney(matter.baseAmountCents, matter.reportingCurrency)}
				</span>
			)}
		</DetailSheetProperty>
	);
}

const CONTACT_COLUMNS = [
	{ id: "name", header: "Name", width: "w-[28%]", className: "pl-5" },
	{ id: "role", header: "Role", width: "w-[20%]" },
	{ id: "title", header: "Title", width: "w-[22%]" },
	{ id: "email", header: "Email", width: "w-[22%]" },
	{ id: "remove", srLabel: "Remove", width: "w-10" },
];

const SERVICE_OPTIONS = MATTER_SERVICES.map((service) => ({
	value: service.id,
	label: service.label,
}));

const PAYMENT_OPTIONS = [
	{ value: "UNPAID", label: "Unpaid" },
	{ value: "PARTIALLY_PAID", label: "Partially paid" },
	{ value: "PAID", label: "Paid" },
	{ value: "WAIVED", label: "Waived" },
];

const KEY_DATE_LABELS = [
	["applicationSubmittedAt", "Application submitted"],
	["biometricsAt", "Biometrics"],
	["decisionDueAt", "Decision due"],
	["decisionReceivedAt", "Decision received"],
	["visaExpiresAt", "Visa expires"],
	["conditionsExpireAt", "Conditions expire"],
] as const;

const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
	month: "short",
	day: "numeric",
	year: "numeric",
};

export function MatterSheet({ matterId }: { matterId: string }) {
	const trpc = useTRPC();
	const openRecord = useOpenRecord();
	const {
		tab,
		setTab,
		form: adding,
		setForm: setAdding,
	} = useRecordSheetView("overview");

	const query = useQuery(trpc.matters.byId.queryOptions({ id: matterId }));
	const matter = query.data;

	const tabs: DetailSheetTab[] = matter
		? [
				{
					value: "overview",
					label: "Overview",
					content: <MatterOverview matter={matter} />,
				},
				{
					value: "contacts",
					label: "Contacts",
					count: matter.contacts.length,
					content: (
						<MatterContacts
							matter={matter}
							adding={adding === "contact"}
							onAdd={() => setAdding("contact")}
							onDone={() => setAdding(null)}
						/>
					),
				},
				{
					value: "documents",
					label: "Documents",
					content: <MatterDocuments matterId={matter.id} />,
				},
				{
					value: "activity",
					label: "Activity",
					content: <Timeline anchor={{ matterId: matter.id }} />,
				},
				{
					value: "agent",
					label: "Agent",
					content: <AgentPanel record={{ kind: "matter", id: matter.id }} />,
					keepMounted: true,
				},
			]
		: [];

	return (
		<RecordSheetFrame
			loading={query.isPending}
			error={query.error?.message ?? null}
			title={matter?.name ?? "Matter"}
			description={
				matter ? (
					<button
						type="button"
						onClick={() =>
							openRecord({ kind: "company", id: matter.company.id })
						}
						className="text-foreground underline-offset-2 hover:underline"
					>
						{matter.company.name}
					</button>
				) : undefined
			}
			media={
				matter ? (
					<EntityLogo
						src={matter.company.iconUrl}
						darkSrc={matter.company.iconDarkUrl}
						tone={matter.company.iconTone as EntityLogoTone | null | undefined}
						name={matter.company.name}
						size="lg"
					/>
				) : null
			}
			actions={
				matter ? (
					<>
						<MatterStageMenu
							matterId={matter.id}
							stage={matter.stage}
							variant="control"
						/>
						<RecordActions
							record={{ kind: "matter", id: matter.id }}
							name={matter.name}
							consequence={`Its stage history, notes and agent conversations go too. ${matter.company.name} and the ${matter.contacts.length === 1 ? "person" : "people"} on it stay in the CRM.`}
							archivedAt={matter.archivedAt}
						/>
					</>
				) : null
			}
			stats={
				matter ? (
					<DetailSheetStats>
						<DetailSheetStat label="Fee">
							{matter.amountCents === null ? (
								<EmptyCellValue />
							) : (
								<span className="tabular-nums">
									{formatMoney(
										matter.amountCents,
										matterCurrency(matter.currency),
									)}
								</span>
							)}
						</DetailSheetStat>
						<DetailSheetStat label="Expected close">
							{matter.expectedCloseDate ? (
								<LocalDay date={matter.expectedCloseDate} />
							) : (
								<EmptyCellValue />
							)}
						</DetailSheetStat>
						<DetailSheetStat label="In stage">
							<LocalRelativeTime date={matter.stageChangedAt} />
						</DetailSheetStat>
						<DetailSheetStat label="Owner">
							<OwnerCell owner={matter.owner} />
						</DetailSheetStat>
					</DetailSheetStats>
				) : null
			}
			tabs={tabs}
			tab={tab}
			onTabChange={setTab}
		/>
	);
}

function MatterOverview({ matter }: { matter: Matter }) {
	const trpc = useTRPC();
	const cache = useCrmCache();

	const users = useQuery(trpc.users.list.queryOptions());

	const update = useMutation(
		trpc.matters.update.mutationOptions({
			onSuccess: () => cache.matter(matter.id, { settle: "record" }),
			onError: (error) => toast.error(error.message),
		}),
	);

	const saveFields = (fields: Record<string, FieldValueJson>) =>
		update.mutate({ id: matter.id, data: { fields } });

	const isSavingField = savingValue(update);

	const save = (data: Parameters<typeof update.mutate>[0]["data"]) =>
		update.mutate({ id: matter.id, data });

	const currency = matterCurrency(matter.currency);

	const isSaving = savingField(update);

	return (
		<DetailSheetBody>
			<ConflictFlag matterId={matter.id} />

			<DetailSheetSection title="Stage">
				<StageStepper matterId={matter.id} stage={matter.stage} />

				{matter.closedReason ? (
					<DetailSheetProperties>
						<DetailSheetProperty label="Closed">
							{matter.closedAt ? (
								<LocalDateTime date={matter.closedAt} options={DATE_OPTIONS} />
							) : (
								<EmptyCellValue />
							)}
						</DetailSheetProperty>
						<DetailSheetProperty label="Reason" wide>
							{matter.closedReason}
						</DetailSheetProperty>
					</DetailSheetProperties>
				) : null}
			</DetailSheetSection>

			<DetailSheetSection title="Service &amp; fee">
				<DetailSheetProperties>
					<InlineSelectField
						label="Service"
						value={matter.serviceType}
						options={SERVICE_OPTIONS}
						onSave={(next) => {
							const nextServiceType =
								next as (typeof MATTER_SERVICES)[number]["id"];
							const fee = serviceDefaultFeeCents(nextServiceType);
							const amountCents =
								matter.amountCents === null && fee !== null
									? fee
									: matter.amountCents;
							save({ serviceType: nextServiceType, amountCents });
						}}
					/>
					<InlineField
						label="Agreed fee (excl. VAT)"
						value={
							matter.amountCents === null
								? null
								: String(matter.amountCents / 100)
						}
						placeholder="2500"
						saving={isSaving("amountCents")}
						onSave={(next) => {
							if (next === "") return save({ amountCents: null });
							const parsed = Number.parseFloat(next);
							if (!Number.isFinite(parsed) || parsed < 0) {
								toast.error("Amount has to be a number.");
								return;
							}
							save({ amountCents: Math.round(parsed * 100) });
						}}
						render={(value) =>
							formatMoney(Math.round(Number(value) * 100), currency)
						}
					/>
					<InlineSelectField
						label="Currency"
						value={currency}
						options={currencyOptions(currency)}
						onSave={(currency) => save({ currency })}
					/>
					<ReportedValue matter={matter} />
					<InlineSelectField
						label="Payment"
						value={matter.paymentStatus}
						options={PAYMENT_OPTIONS}
						onSave={(paymentStatus) =>
							save({
								paymentStatus: paymentStatus as Matter["paymentStatus"],
							})
						}
					/>
					<InlineField
						label="Disbursements"
						value={matter.disbursementsNotes}
						placeholder="IHS, Home Office fee, priority service…"
						saving={isSaving("disbursementsNotes")}
						onSave={(disbursementsNotes) =>
							save({ disbursementsNotes: disbursementsNotes || null })
						}
					/>
				</DetailSheetProperties>
			</DetailSheetSection>

			<MatterKeyDates matter={matter} save={save} isSaving={isSaving} />

			<DetailSheetSection title="Details" action={<FieldsCog kind="matter" />}>
				<DetailSheetProperties>
					<InlineField
						label="Name"
						value={matter.name}
						saving={isSaving("name")}
						onSave={(name) => name && save({ name })}
					/>
					<InlineDateField
						label="Target date"
						value={matter.expectedCloseDate}
						saving={isSaving("expectedCloseDate")}
						onSave={(next) => save({ expectedCloseDate: next || null })}
					/>
					<InlineCompanyField
						value={matter.company.id}
						company={matter.company}
						saving={isSaving("companyId")}
						onSave={(companyId) => save({ companyId })}
					/>
					<InlineSelectField
						label="Owner"
						value={matter.owner.id}
						options={(users.data ?? []).map((user) => ({
							value: user.id,
							label: user.name,
						}))}
						onSave={(ownerId) => save({ ownerId })}
					/>
					<RecordFields
						fields={matter.fields}
						saving={isSavingField}
						onSave={saveFields}
					/>
				</DetailSheetProperties>
			</DetailSheetSection>

			<DetailSheetSection title="Description">
				<InlineTextArea
					label="Description"
					value={matter.description}
					placeholder={`What ${matter.company.name} is buying, why now, and what stands in the way.`}
					saving={isSaving("description")}
					onSave={(description) => save({ description })}
				/>
			</DetailSheetSection>

			<WhereItStands matter={matter} />
		</DetailSheetBody>
	);
}

function ConflictFlag({ matterId }: { matterId: string }) {
	const trpc = useTRPC();
	const cache = useCrmCache();
	const queryClient = useQueryClient();

	const listKey = trpc.conflictChecks.list.queryKey({ matterId });
	const query = useQuery(trpc.conflictChecks.list.queryOptions({ matterId }));

	const dismiss = useMutation(
		trpc.conflictChecks.dismiss.mutationOptions({
			onMutate: async ({ id, note }) => {
				await queryClient.cancelQueries({ queryKey: listKey });
				const previous = queryClient.getQueryData(listKey);
				if (previous) {
					queryClient.setQueryData(listKey, {
						...previous,
						checks: previous.checks.map((check) =>
							check.id === id
								? {
										...check,
										status: "DISMISSED" as const,
										dismissedAt: new Date().toISOString(),
										dismissedNote: note,
									}
								: check,
						),
					});
				}
				return { previous };
			},
			onError: (error, _input, context) => {
				if (context?.previous)
					queryClient.setQueryData(listKey, context.previous);
				toast.error(error.message);
			},
			onSettled: () => cache.matter(matterId, { settle: "record" }),
		}),
	);

	const flag = query.data?.checks.find(
		(check) => check.status === "POTENTIAL_CONFLICT",
	);
	if (!flag) return null;

	return (
		<Alert variant="warning">
			<Icon icon={WarningAlt} />
			<AlertTitle>Potential conflict of interest</AlertTitle>
			<AlertDescription>
				<ul className="mt-1 space-y-0.5">
					{flag.matches.map((match) => (
						<li key={`${match.kind}:${match.id}:${match.matchedOn}`}>
							<span className="font-medium">{match.label}</span> —{" "}
							{match.detail}
						</li>
					))}
				</ul>
				<div className="mt-2">
					<Button
						variant="outline"
						size="sm"
						disabled={dismiss.isPending}
						onClick={() => {
							const note = window.prompt(
								"Why is this not a conflict? The note goes on the record.",
							);
							if (note?.trim()) dismiss.mutate({ id: flag.id, note });
						}}
					>
						Reviewed — not a conflict
					</Button>
				</div>
			</AlertDescription>
		</Alert>
	);
}

function MatterKeyDates({
	matter,
	save,
	isSaving,
}: {
	matter: Matter;
	save: (data: {
		applicationSubmittedAt?: string | null;
		biometricsAt?: string | null;
		decisionDueAt?: string | null;
		decisionReceivedAt?: string | null;
		visaExpiresAt?: string | null;
		conditionsExpireAt?: string | null;
	}) => void;
	isSaving: (field: string) => boolean;
}) {
	const trpc = useTRPC();
	const cache = useCrmCache();

	const addKeyDate = useMutation(
		trpc.matters.addKeyDate.mutationOptions({
			onSuccess: () => cache.matter(matter.id, { settle: "record" }),
			onError: (error) => toast.error(error.message),
		}),
	);

	const removeKeyDate = useMutation(
		trpc.matters.removeKeyDate.mutationOptions({
			onSuccess: () => cache.matter(matter.id, { settle: "record" }),
			onError: (error) => toast.error(error.message),
		}),
	);

	return (
		<DetailSheetSection title="Key dates">
			<DetailSheetProperties>
				{KEY_DATE_LABELS.map(([field, label]) => (
					<InlineDateField
						key={field}
						label={label}
						value={matter[field]}
						saving={isSaving(field)}
						onSave={(next) => save({ [field]: next || null })}
					/>
				))}
				{matter.keyDates.map((keyDate) => (
					<DetailSheetProperty key={keyDate.id} label={keyDate.label}>
						<span className="flex items-center gap-1.5">
							<LocalDateTime date={keyDate.date} options={DATE_OPTIONS} />
							{keyDate.notes ? (
								<span className="text-muted-foreground">({keyDate.notes})</span>
							) : null}
							<Button
								variant="ghost"
								size="icon-xs"
								disabled={removeKeyDate.isPending}
								onClick={() =>
									removeKeyDate.mutate({
										matterId: matter.id,
										keyDateId: keyDate.id,
									})
								}
							>
								<Icon icon={Close} />
								<span className="sr-only">Remove {keyDate.label}</span>
							</Button>
						</span>
					</DetailSheetProperty>
				))}
			</DetailSheetProperties>

			<form
				className="mt-2 flex items-center gap-2"
				onSubmit={(event) => {
					event.preventDefault();
					const form = event.currentTarget;
					const data = new FormData(form);
					const label = String(data.get("label") ?? "").trim();
					const date = String(data.get("date") ?? "");
					if (!label || !date) return;
					addKeyDate.mutate(
						{ matterId: matter.id, label, date },
						{ onSuccess: () => form.reset() },
					);
				}}
			>
				<Input
					name="label"
					placeholder="Sponsor licence renewal…"
					className="h-7 max-w-56 text-xs"
				/>
				<Input name="date" type="date" className="h-7 max-w-36 text-xs" />
				<Button
					type="submit"
					variant="outline"
					size="sm"
					disabled={addKeyDate.isPending}
				>
					<Icon icon={Add} data-icon="inline-start" />
					Add date
				</Button>
			</form>
		</DetailSheetSection>
	);
}

const DOCUMENT_COLUMNS = [
	{ id: "done", srLabel: "Received", width: "w-10", className: "pl-5" },
	{ id: "label", header: "Document", width: "w-[44%]" },
	{ id: "status", header: "Status", width: "w-[22%]" },
	{ id: "received", header: "Received", width: "w-[22%]" },
	{ id: "remove", srLabel: "Remove", width: "w-10" },
];

const DOCUMENT_STATUS_LABEL = {
	OUTSTANDING: "Outstanding",
	RECEIVED: "Received",
	NOT_APPLICABLE: "Not applicable",
} as const;

function MatterDocuments({ matterId }: { matterId: string }) {
	const trpc = useTRPC();
	const cache = useCrmCache();
	const queryClient = useQueryClient();

	const listKey = trpc.documentChecklist.list.queryKey({ matterId });
	const query = useQuery(
		trpc.documentChecklist.list.queryOptions({ matterId }),
	);

	const update = useMutation(
		trpc.documentChecklist.update.mutationOptions({
			onMutate: async (input) => {
				await queryClient.cancelQueries({ queryKey: listKey });
				const previous = queryClient.getQueryData(listKey);
				if (previous) {
					queryClient.setQueryData(listKey, {
						...previous,
						items: previous.items.map((item) =>
							item.id === input.id
								? {
										...item,
										...input,
										receivedAt:
											input.status === "RECEIVED"
												? new Date().toISOString()
												: input.status
													? null
													: item.receivedAt,
									}
								: item,
						),
					});
				}
				return { previous };
			},
			onError: (error, _input, context) => {
				if (context?.previous)
					queryClient.setQueryData(listKey, context.previous);
				toast.error(error.message);
			},
			onSettled: () => cache.matter(matterId, { settle: "record" }),
		}),
	);

	const create = useMutation(
		trpc.documentChecklist.create.mutationOptions({
			onSuccess: () => cache.matter(matterId, { settle: "record" }),
			onError: (error) => toast.error(error.message),
		}),
	);

	const remove = useMutation(
		trpc.documentChecklist.remove.mutationOptions({
			onMutate: async (input) => {
				await queryClient.cancelQueries({ queryKey: listKey });
				const previous = queryClient.getQueryData(listKey);
				if (previous) {
					queryClient.setQueryData(listKey, {
						...previous,
						items: previous.items.filter((item) => item.id !== input.id),
					});
				}
				return { previous };
			},
			onError: (error, _input, context) => {
				if (context?.previous)
					queryClient.setQueryData(listKey, context.previous);
				toast.error(error.message);
			},
			onSettled: () => cache.matter(matterId, { settle: "record" }),
		}),
	);

	const items = query.data?.items ?? [];

	if (!query.isPending && items.length === 0) {
		return (
			<DetailSheetEmpty
				icon={DocumentBlank}
				title="No documents tracked"
				description="This matter has no checklist yet. Add the documents the application needs and tick them off as they come in."
				action={
					<Button
						variant="outline"
						size="sm"
						onClick={() => {
							const label = window.prompt("Which document?");
							if (label?.trim()) create.mutate({ matterId, label });
						}}
					>
						<Icon icon={Add} data-icon="inline-start" />
						Add document
					</Button>
				}
			/>
		);
	}

	return (
		<SimpleTable variant="panel" columns={DOCUMENT_COLUMNS}>
			{items.map((item) => (
				<SimpleTableRow key={item.id}>
					<TableCell className="py-2.5 pr-1 pl-5">
						<Checkbox
							checked={item.status === "RECEIVED"}
							disabled={update.isPending}
							onCheckedChange={(checked) =>
								update.mutate({
									id: item.id,
									matterId,
									status: checked ? "RECEIVED" : "OUTSTANDING",
								})
							}
							aria-label={`Mark ${item.label} as received`}
						/>
					</TableCell>
					<TableCell className="truncate px-3 py-2.5 font-medium">
						<span
							className={
								item.status === "NOT_APPLICABLE"
									? "text-muted-foreground line-through"
									: undefined
							}
						>
							{item.label}
							{item.required ? null : (
								<span className="text-muted-foreground"> (optional)</span>
							)}
						</span>
						{item.description ? (
							<span className="block truncate text-muted-foreground text-xs">
								{item.description}
							</span>
						) : null}
					</TableCell>
					<TableCell className="truncate px-3 py-2.5">
						<button
							type="button"
							className="text-muted-foreground underline-offset-2 hover:underline"
							onClick={() =>
								update.mutate({
									id: item.id,
									matterId,
									status:
										item.status === "NOT_APPLICABLE"
											? "OUTSTANDING"
											: "NOT_APPLICABLE",
								})
							}
						>
							{DOCUMENT_STATUS_LABEL[item.status]}
						</button>
					</TableCell>
					<TableCell className="truncate px-3 py-2.5 text-muted-foreground">
						{item.receivedAt ? (
							<LocalDateTime date={item.receivedAt} options={DATE_OPTIONS} />
						) : (
							<EmptyCellValue />
						)}
					</TableCell>
					<TableCell className="px-3 py-2.5">
						<Button
							variant="ghost"
							size="icon-xs"
							disabled={remove.isPending}
							onClick={() => remove.mutate({ id: item.id, matterId })}
						>
							<Icon icon={Close} />
							<span className="sr-only">Remove {item.label}</span>
						</Button>
					</TableCell>
				</SimpleTableRow>
			))}

			<AddRow
				label="Add document"
				columns={DOCUMENT_COLUMNS.length}
				onClick={() => {
					const label = window.prompt("Which document?");
					if (label?.trim()) create.mutate({ matterId, label });
				}}
			/>
		</SimpleTable>
	);
}

function WhereItStands({ matter }: { matter: Matter }) {
	const openRecord = useOpenRecord();

	return (
		<DetailSheetSection title="Where it stands">
			<DetailSheetProperties>
				<DetailSheetProperty label="Opened">
					<LocalDateTime date={matter.createdAt} options={DATE_OPTIONS} />
				</DetailSheetProperty>

				<DetailSheetProperty label="In stage since">
					<LocalDateTime date={matter.stageChangedAt} options={DATE_OPTIONS} />
				</DetailSheetProperty>

				{matter.closedAt ? (
					<DetailSheetProperty label="Closed">
						<LocalDateTime date={matter.closedAt} options={DATE_OPTIONS} />
					</DetailSheetProperty>
				) : null}

				{matter.closedReason ? (
					<DetailSheetProperty label="Reason" wide>
						{matter.closedReason}
					</DetailSheetProperty>
				) : null}

				<DetailSheetProperty label="On it" wide>
					{matter.contacts.length === 0 ? (
						<span className="text-muted-foreground">
							Nobody from {matter.company.name} is attached yet.
						</span>
					) : (
						<span className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
							{matter.contacts.map((contact) => {
								const aside = contact.role ?? contact.title;
								return (
									<button
										key={contact.id}
										type="button"
										onClick={() =>
											openRecord({ kind: "contact", id: contact.id })
										}
										className="min-w-0 truncate underline-offset-2 hover:underline"
									>
										{contactName(contact)}
										{aside ? (
											<span className="text-muted-foreground"> ({aside})</span>
										) : null}
									</button>
								);
							})}
						</span>
					)}
				</DetailSheetProperty>
			</DetailSheetProperties>
		</DetailSheetSection>
	);
}

function MatterContacts({
	matter,
	adding,
	onAdd,
	onDone,
}: {
	matter: Matter;
	adding: boolean;
	onAdd: () => void;
	onDone: () => void;
}) {
	const trpc = useTRPC();
	const cache = useCrmCache();
	const openRecord = useOpenRecord();

	const detach = useMutation(
		trpc.matters.detachContact.mutationOptions({
			onSuccess: () => cache.matter(matter.id, { settle: "record" }),
			onError: (error) => toast.error(error.message),
		}),
	);

	const setRole = useMutation(
		trpc.matters.setContactRole.mutationOptions({
			onSuccess: () => cache.matter(matter.id, { settle: "record" }),
			onError: (error) => toast.error(error.message),
		}),
	);

	const form = adding ? (
		<AttachMatterContact
			matterId={matter.id}
			companyName={matter.company.name}
			onDone={onDone}
		/>
	) : null;

	if (matter.contacts.length === 0) {
		return (
			<>
				{form}
				{adding ? null : (
					<DetailSheetEmpty
						icon={UserMultiple}
						title="No contacts on this matter"
						description={`Nobody from ${matter.company.name} is attached yet. Bring the people you are selling to onto the matter and it says who to chase.`}
						action={
							<Button variant="outline" size="sm" onClick={onAdd}>
								<Icon icon={Add} data-icon="inline-start" />
								Add contact
							</Button>
						}
					/>
				)}
			</>
		);
	}

	return (
		<>
			{form}
			<SimpleTable variant="panel" columns={CONTACT_COLUMNS}>
				{matter.contacts.map((contact) => (
					<SimpleTableRow
						key={contact.id}
						clickable
						onClick={() => openRecord({ kind: "contact", id: contact.id })}
					>
						<TableCell className="truncate py-2.5 pr-3 pl-5 font-medium">
							<span className="flex min-w-0 items-center gap-2">
								<PersonAvatar
									src={contact.imageUrl}
									name={contactName(contact)}
									email={contact.email}
									size="sm"
								/>
								<span className="truncate">{contactName(contact)}</span>
							</span>
						</TableCell>
						<TableCell className="truncate px-1 py-2.5">
							<InlineTextCell
								label={`Role on this matter for ${contactName(contact)}`}
								value={contact.role}
								placeholder="Champion"
								saving={
									setRole.isPending &&
									setRole.variables?.contactId === contact.id
								}
								onSave={(role) =>
									setRole.mutate({
										matterId: matter.id,
										contactId: contact.id,
										role: role || null,
									})
								}
							/>
						</TableCell>
						<TableCell className="truncate px-3 py-2.5 text-muted-foreground">
							{contact.title ?? <EmptyCellValue />}
						</TableCell>
						<TableCell className="truncate px-3 py-2.5 text-muted-foreground">
							{contact.email ?? <EmptyCellValue />}
						</TableCell>
						<TableCell className="px-3 py-2.5">
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="ghost"
										size="icon-xs"
										disabled={detach.isPending}
										onClick={(event) => {
											event.stopPropagation();
											detach.mutate({
												matterId: matter.id,
												contactId: contact.id,
											});
										}}
									>
										<Icon icon={Close} />
										<span className="sr-only">
											Take {contactName(contact)} off this matter
										</span>
									</Button>
								</TooltipTrigger>
								<TooltipContent>Take off this matter</TooltipContent>
							</Tooltip>
						</TableCell>
					</SimpleTableRow>
				))}

				<AddRow
					label="Add contact"
					columns={CONTACT_COLUMNS.length}
					onClick={onAdd}
				/>
			</SimpleTable>
		</>
	);
}
