import {
	ActivityType,
	type Db,
	MatterStage,
	Prisma,
	RecordSource,
} from "@crm/db";
import { checklistTemplateFor } from "@crm/validation/document-checklists";
import {
	matchServiceType,
	serviceDefaultFeeCents,
	serviceLabel,
} from "@crm/validation/matter-services";
import { Injectable, Logger } from "@nestjs/common";
import { AgentTriggerService } from "../agent/agent-trigger.service";
import { CompanyDirectoryService } from "../companies/company-directory.service";
import { ActivityStampService } from "../crm/activity-stamp.service";
import { normalizeEmail } from "../crm/values";
import { InjectDatabase } from "../database/database.constants";
import { isAutomatedAddress, isMachineAddress } from "../mailbox/participants";
import type { IntakeSubmission } from "./intake.contracts";

export type IntakeOutcome =
	| { filed: true; contactId: string; matterId: string }
	| { filed: false; reason: string };

@Injectable()
export class IntakeService {
	private readonly logger = new Logger(IntakeService.name);

	constructor(
		@InjectDatabase() private readonly db: Db,
		private readonly companies: CompanyDirectoryService,
		private readonly agent: AgentTriggerService,
		private readonly stamp: ActivityStampService,
	) {}

	async submit(payload: IntakeSubmission): Promise<IntakeOutcome> {
		const dedupeKey = `intake:${payload.formId}:${payload.applicant.email.toLowerCase()}:${payload.submittedAt ?? ""}`;

		const submission = await this.db.formSubmission.upsert({
			where: { dedupeKey },
			update: {},
			create: {
				host: "power-automate",
				path: "/api/intake/submissions",
				email: payload.applicant.email,
				fields: {
					formId: payload.formId,
					serviceTypeRaw: payload.serviceType ?? null,
					phone: payload.applicant.phone ?? null,
					...payload.fields,
				} as Prisma.InputJsonValue,
				dedupeKey,
			},
			select: { id: true, filedAt: true },
		});

		if (submission.filedAt) {
			const filed = await this.db.formSubmission.findUnique({
				where: { id: submission.id },
				select: { contactId: true },
			});
			if (filed?.contactId) {
				const matter = await this.db.matter.findFirst({
					where: { contacts: { some: { contactId: filed.contactId } } },
					orderBy: { createdAt: "desc" },
					select: { id: true },
				});
				if (matter) {
					return {
						filed: true,
						contactId: filed.contactId,
						matterId: matter.id,
					};
				}
			}
			return { filed: false, reason: "Already processed" };
		}

		const email = normalizeEmail(payload.applicant.email);
		if (!email) return this.skip(submission.id, "No usable email address");

		if (isMachineAddress(email) || isAutomatedAddress(email)) {
			return this.skip(submission.id, "Not an address a human reads");
		}

		const domain = email.split("@")[1] ?? null;
		if (!domain) return this.skip(submission.id, "No usable domain");

		const suppressed = await this.suppressed(email, domain);
		if (suppressed) return this.skip(submission.id, suppressed);

		const serviceType = matchServiceType(payload.serviceType ?? "");
		const firstName = payload.applicant.firstName.trim();
		const lastName = payload.applicant.lastName?.trim() || null;

		const existingContact = await this.db.contact.findFirst({
			where: { email, archivedAt: null },
			select: { id: true, companyId: true },
		});

		const contactId = existingContact
			? existingContact.id
			: await this.createContact({ firstName, lastName, email });

		const companyId = existingContact?.companyId
			? existingContact.companyId
			: await this.companyFor({ firstName, lastName, email });

		if (!existingContact?.companyId && companyId) {
			await this.db.contact.update({
				where: { id: contactId },
				data: { companyId },
			});
		}

		const matterId = await this.createMatter({
			contactId,
			companyId,
			firstName,
			lastName,
			serviceType,
		});

		await this.db.formSubmission.update({
			where: { id: submission.id },
			data: { contactId, filedAt: new Date(), skipReason: null },
		});

		await this.stamp.touch({ contactId, companyId, matterId }, new Date());

		await this.agent.conflictCheckRequested(
			{ matterId },
			"New matter from intake",
		);

		this.logger.log({
			message: "Intake submission filed",
			contactId,
			matterId,
			serviceType,
		});

		return { filed: true, contactId, matterId };
	}

	private async createContact(input: {
		firstName: string;
		lastName: string | null;
		email: string;
	}): Promise<string> {
		const contact = await this.db.contact.create({
			data: {
				firstName: input.firstName,
				lastName: input.lastName,
				email: input.email,
				source: RecordSource.MANUAL,
				lastActivityAt: new Date(),
			},
			select: { id: true },
		});

		await this.agent.contactCreated(contact.id, "Intake form submission");

		return contact.id;
	}

	private async companyFor(input: {
		firstName: string;
		lastName: string | null;
		email: string;
	}): Promise<string> {
		const fromDomain = await this.companies.companyForEmail(input.email);
		if (fromDomain) return fromDomain;

		const name = [input.firstName, input.lastName].filter(Boolean).join(" ");
		const company = await this.db.company.create({
			data: { name: `${name} (individual client)` },
			select: { id: true },
		});
		return company.id;
	}

	private async createMatter(input: {
		contactId: string;
		companyId: string;
		firstName: string;
		lastName: string | null;
		serviceType: ReturnType<typeof matchServiceType>;
	}): Promise<string> {
		const ownerId = await this.anyOwner();
		const feeCents = serviceDefaultFeeCents(input.serviceType);
		const name = `${serviceLabel(input.serviceType)} — ${[input.firstName, input.lastName].filter(Boolean).join(" ")}`;

		const matter = await this.db.matter.create({
			data: {
				name,
				companyId: input.companyId,
				ownerId,
				stage: MatterStage.ENQUIRY,
				serviceType: input.serviceType,
				amount: feeCents === null ? null : feeCents / 100,
				currency: "GBP",
				contacts: { create: { contactId: input.contactId } },
			},
			select: { id: true },
		});

		const template = checklistTemplateFor(input.serviceType);
		if (template.length > 0) {
			await this.db.documentChecklistItem.createMany({
				data: template.map((item, index) => ({
					matterId: matter.id,
					label: item.label,
					description: item.description ?? null,
					required: item.required,
					position: index,
					templateKey: item.key,
				})),
			});
		}

		await this.db.activity.create({
			data: {
				type: ActivityType.NOTE,
				subject: "Matter opened from intake form",
				contactId: input.contactId,
				companyId: input.companyId,
				matterId: matter.id,
				occurredAt: new Date(),
				createdById: ownerId,
				meta: { automated: true, source: "intake" },
			},
		});

		return matter.id;
	}

	private async anyOwner(): Promise<string> {
		const user = await this.db.user.findFirstOrThrow({
			orderBy: { createdAt: "asc" },
			select: { id: true },
		});
		return user.id;
	}

	private async skip(
		submissionId: string,
		reason: string,
	): Promise<IntakeOutcome> {
		await this.db.formSubmission.update({
			where: { id: submissionId },
			data: { skipReason: reason },
		});
		return { filed: false, reason };
	}

	private async suppressed(
		email: string,
		domain: string,
	): Promise<string | null> {
		const [contact, host] = await Promise.all([
			this.db.suppressedContact.findFirst({
				where: { email: { equals: email, mode: "insensitive" } },
				select: { email: true },
			}),
			this.db.suppressedDomain.findUnique({
				where: { domain },
				select: { domain: true },
			}),
		]);

		if (contact) return "This address was deleted by a rep";
		if (host) return "This domain is suppressed";
		return null;
	}

	async status(): Promise<{
		recent: Array<{
			id: string;
			email: string | null;
			filedAt: string | null;
			skipReason: string | null;
			createdAt: string;
		}>;
	}> {
		const rows = await this.db.formSubmission.findMany({
			where: { host: "power-automate" },
			orderBy: { createdAt: "desc" },
			take: 20,
			select: {
				id: true,
				email: true,
				filedAt: true,
				skipReason: true,
				createdAt: true,
			},
		});

		return {
			recent: rows.map((row) => ({
				id: row.id,
				email: row.email,
				filedAt: row.filedAt?.toISOString() ?? null,
				skipReason: row.skipReason,
				createdAt: row.createdAt.toISOString(),
			})),
		};
	}
}
