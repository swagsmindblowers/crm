import { type Db, DocumentChecklistStatus } from "@crm/db";
import { MatterStage } from "@crm/db/enums";
import {
	clientMatterStatusFor,
	clientMatterStatusLabel,
} from "@crm/validation/client-portal-status";
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectDatabase } from "../database/database.constants";
import { DocumentChecklistService } from "../document-checklist/document-checklist.service";
import type {
	PortalMatterDetail,
	PortalMatterList,
} from "./client-portal-matters.contracts";

const MATTER_SELECT = {
	id: true,
	name: true,
	stage: true,
	company: { select: { name: true } },
} as const;

type MatterRow = {
	id: string;
	name: string;
	stage: MatterStage;
	company: { name: string };
};

function summarize(row: MatterRow) {
	return {
		id: row.id,
		name: row.name,
		companyName: row.company.name,
		status: clientMatterStatusFor(row.stage),
		statusLabel: clientMatterStatusLabel(row.stage),
	};
}

@Injectable()
export class ClientPortalMattersService {
	constructor(
		@InjectDatabase() private readonly db: Db,
		private readonly checklist: DocumentChecklistService,
	) {}

	private async visibleMatterWhere(contactId: string) {
		const contact = await this.db.contact.findUnique({
			where: { id: contactId },
			select: { isCompanyAdmin: true, companyId: true },
		});

		if (contact?.isCompanyAdmin && contact.companyId) {
			return { companyId: contact.companyId };
		}

		return { contacts: { some: { contactId } } };
	}

	async list(contactId: string): Promise<PortalMatterList> {
		const where = await this.visibleMatterWhere(contactId);
		const matters = await this.db.matter.findMany({
			where,
			select: MATTER_SELECT,
			orderBy: { createdAt: "desc" },
		});

		return { matters: matters.map(summarize) };
	}

	async detail(
		contactId: string,
		matterId: string,
	): Promise<PortalMatterDetail> {
		const where = await this.visibleMatterWhere(contactId);
		const matter = await this.db.matter.findFirst({
			where: { ...where, id: matterId },
			select: MATTER_SELECT,
		});
		if (!matter) {
			throw new NotFoundException("No matter with that id.");
		}

		const { items } = await this.checklist.list(matterId);

		return {
			...summarize(matter),
			checklist: items
				.filter(
					(item) => item.status !== DocumentChecklistStatus.NOT_APPLICABLE,
				)
				.map((item) => ({
					id: item.id,
					label: item.label,
					description: item.description,
					required: item.required,
					status:
						item.status === DocumentChecklistStatus.RECEIVED
							? "received"
							: "outstanding",
					uploads: item.uploads.map((upload) => ({
						id: upload.id,
						filename: upload.filename,
						reviewStatus: upload.reviewStatus,
						reviewNote: upload.reviewNote,
						createdAt: upload.createdAt,
					})),
				})),
		};
	}

	async assertVisible(contactId: string, matterId: string): Promise<void> {
		const where = await this.visibleMatterWhere(contactId);
		const matter = await this.db.matter.findFirst({
			where: { ...where, id: matterId },
			select: { id: true },
		});
		if (!matter) {
			throw new NotFoundException("No matter with that id.");
		}
	}
}
