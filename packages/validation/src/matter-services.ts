import { z } from "zod";

export const MATTER_SERVICES = [
	{
		id: "DIAGNOSTIC_CONSULTATION",
		label: "Initial Diagnostic Consultation (up to 1 hour)",
		defaultFeeCents: 150_00,
	},
	{
		id: "DOCUMENT_CHECKING",
		label: "Document Checking Service",
		defaultFeeCents: 350_00,
	},
	{
		id: "CERTIFICATE_OF_ENTITLEMENT",
		label: "Certificate of Entitlement (NTL/TOC)",
		defaultFeeCents: 1_200_00,
	},
	{
		id: "SUBJECT_ACCESS_REQUEST",
		label: "Subject Access Request (SAR)",
		defaultFeeCents: 600_00,
	},
	{
		id: "EUSS_APPLICATION",
		label: "EUSS Application",
		defaultFeeCents: 1_000_00,
	},
	{
		id: "SPOUSE_PARTNER_VISA",
		label: "Spouse/Partner Visa (Entry Clearance or FLR)",
		defaultFeeCents: 2_000_00,
	},
	{
		id: "FIANCE_CIVIL_PARTNER",
		label: "Fiancé/Proposed Civil Partner (Entry Clearance)",
		defaultFeeCents: 2_500_00,
	},
	{
		id: "PARENT_OF_BRITISH_CHILD",
		label: "Parent of a British Child (FLR)",
		defaultFeeCents: 2_000_00,
	},
	{
		id: "ILR_SPOUSE_PARTNER",
		label: "ILR — Spouse/Partner (SET(M))",
		defaultFeeCents: 2_800_00,
	},
	{
		id: "ILR_LONG_RESIDENCE",
		label: "ILR — Long Residence (SET(LR))",
		defaultFeeCents: 2_800_00,
	},
	{
		id: "ADULT_DEPENDENT_RELATIVE",
		label: "Adult Dependent Relative (ADR)",
		defaultFeeCents: 3_500_00,
	},
	{
		id: "SPONSOR_LICENCE",
		label: "Sponsor Licence Application",
		defaultFeeCents: 3_000_00,
	},
	{
		id: "SKILLED_WORKER_VISA",
		label: "Skilled Worker Visa (Entry Clearance or FLR)",
		defaultFeeCents: 2_500_00,
	},
	{
		id: "SENIOR_SPECIALIST_WORKER",
		label: "Senior or Specialist Worker (GBM)",
		defaultFeeCents: 2_800_00,
	},
	{
		id: "INNOVATOR_FOUNDER_GLOBAL_TALENT",
		label: "Innovator Founder / Global Talent Visa (visa stage)",
		defaultFeeCents: 7_500_00,
	},
	{
		id: "ILR_WORK_ROUTE",
		label: "ILR — Work Route (SET(O))",
		defaultFeeCents: 3_500_00,
	},
	{
		id: "NATURALISATION_ADULT",
		label: "Naturalisation as a British Citizen (Adult, AN)",
		defaultFeeCents: 1_500_00,
	},
	{
		id: "REGISTRATION_BRITISH_CITIZEN_CHILD",
		label: "Registration as a British Citizen (Child)",
		defaultFeeCents: 2_000_00,
	},
	{
		id: "STUDENT_VISA",
		label: "Student Visa (Initial/Extension)",
		defaultFeeCents: 1_500_00,
	},
	{
		id: "VISITOR_VISA",
		label: "Visitor Visa (Standard)",
		defaultFeeCents: 1_500_00,
	},
	{
		id: "OTHER",
		label: "Other service",
		defaultFeeCents: null,
	},
] as const;

export type MatterService = (typeof MATTER_SERVICES)[number];

export type MatterServiceId = MatterService["id"];

export const SERVICE_TYPE_IDS = MATTER_SERVICES.map(
	(service) => service.id,
) as [MatterServiceId, ...MatterServiceId[]];

export const serviceTypeId = z.enum(SERVICE_TYPE_IDS);

const BY_ID = new Map<string, MatterService>(
	MATTER_SERVICES.map((service) => [service.id, service]),
);

export function serviceLabel(id: MatterServiceId): string {
	return BY_ID.get(id)?.label ?? id;
}

export function serviceDefaultFeeCents(id: MatterServiceId): number | null {
	return BY_ID.get(id)?.defaultFeeCents ?? null;
}

const NORMALIZE = /[^a-z0-9]+/g;

export function matchServiceType(raw: string): MatterServiceId {
	const needle = raw.toLowerCase().replace(NORMALIZE, " ").trim();
	if (!needle) return "OTHER";
	for (const service of MATTER_SERVICES) {
		if (service.id === "OTHER") continue;
		const idWords = service.id.toLowerCase().replace(NORMALIZE, " ").trim();
		const labelWords = service.label
			.toLowerCase()
			.replace(NORMALIZE, " ")
			.trim();
		if (needle === idWords || needle === labelWords) return service.id;
	}
	for (const service of MATTER_SERVICES) {
		if (service.id === "OTHER") continue;
		const labelWords = service.label
			.toLowerCase()
			.replace(NORMALIZE, " ")
			.trim();
		if (labelWords.includes(needle) || needle.includes(labelWords)) {
			return service.id;
		}
	}
	return "OTHER";
}
