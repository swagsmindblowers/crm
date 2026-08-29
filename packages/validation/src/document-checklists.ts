import type { MatterServiceId } from "./matter-services";

export type ChecklistTemplateItem = {
	key: string;
	label: string;
	description?: string;
	required: boolean;
};

const IDENTITY: ChecklistTemplateItem[] = [
	{ key: "passport", label: "Current passport", required: true },
	{
		key: "brp",
		label: "BRP / eVisa share code",
		description: "Current UK immigration status evidence, when held",
		required: false,
	},
];

const FINANCIAL: ChecklistTemplateItem[] = [
	{
		key: "bank-statements",
		label: "Bank statements (6 months)",
		required: true,
	},
	{ key: "payslips", label: "Payslips (6 months)", required: true },
	{
		key: "employment-letter",
		label: "Employer letter confirming role and salary",
		required: true,
	},
];

const RELATIONSHIP: ChecklistTemplateItem[] = [
	{
		key: "relationship-evidence",
		label: "Relationship evidence",
		description: "Cohabitation, communication, joint finances",
		required: true,
	},
	{
		key: "marriage-certificate",
		label: "Marriage / civil partnership certificate",
		required: true,
	},
	{
		key: "sponsor-status",
		label: "Sponsor's passport or status evidence",
		required: true,
	},
];

const ENGLISH_AND_LIFE: ChecklistTemplateItem[] = [
	{
		key: "english-test",
		label: "Approved English language test",
		required: true,
	},
	{
		key: "life-in-uk",
		label: "Life in the UK test pass",
		required: true,
	},
];

const ACCOMMODATION: ChecklistTemplateItem = {
	key: "accommodation",
	label: "Accommodation evidence",
	description: "Tenancy agreement, mortgage statement or property inspection",
	required: true,
};

const TB_TEST: ChecklistTemplateItem = {
	key: "tb-test",
	label: "TB test certificate",
	description: "Only for applicants from listed countries",
	required: false,
};

const RESIDENCE_HISTORY: ChecklistTemplateItem = {
	key: "residence-history",
	label: "Residence and absence history",
	description: "Travel history against the continuous residence rules",
	required: true,
};

export const DOCUMENT_CHECKLIST_TEMPLATES = {
	DIAGNOSTIC_CONSULTATION: [
		{ key: "passport", label: "Current passport", required: false },
		{
			key: "immigration-history",
			label: "Immigration history summary",
			description: "Previous applications, refusals, visas held",
			required: true,
		},
	],
	DOCUMENT_CHECKING: [
		{
			key: "draft-application",
			label: "Draft application form",
			required: true,
		},
		{
			key: "supporting-bundle",
			label: "Supporting document bundle",
			required: true,
		},
	],
	CERTIFICATE_OF_ENTITLEMENT: [
		...IDENTITY,
		{
			key: "birth-certificate",
			label: "Full birth certificate",
			required: true,
		},
		{
			key: "parent-status",
			label: "Parent's British citizenship or settlement evidence",
			required: true,
		},
	],
	SUBJECT_ACCESS_REQUEST: [
		{ key: "passport", label: "Current passport", required: true },
		{ key: "authority", label: "Signed letter of authority", required: true },
		{
			key: "previous-references",
			label: "Previous Home Office reference numbers",
			required: false,
		},
	],
	EUSS_APPLICATION: [
		...IDENTITY,
		RESIDENCE_HISTORY,
		{
			key: "residence-evidence",
			label: "UK residence evidence",
			description: "P60s, tenancy agreements, utility bills across the period",
			required: true,
		},
	],
	SPOUSE_PARTNER_VISA: [
		...IDENTITY,
		...RELATIONSHIP,
		...FINANCIAL,
		ACCOMMODATION,
		{
			key: "english-test",
			label: "Approved English language test",
			required: true,
		},
		TB_TEST,
	],
	FIANCE_CIVIL_PARTNER: [
		...IDENTITY,
		...RELATIONSHIP.filter((item) => item.key !== "marriage-certificate"),
		{
			key: "wedding-plans",
			label: "Evidence of intended marriage within 6 months",
			required: true,
		},
		...FINANCIAL,
		ACCOMMODATION,
		TB_TEST,
	],
	PARENT_OF_BRITISH_CHILD: [
		...IDENTITY,
		{
			key: "child-birth-certificate",
			label: "Child's full birth certificate",
			required: true,
		},
		{
			key: "child-status",
			label: "Child's British passport or status evidence",
			required: true,
		},
		{
			key: "parental-responsibility",
			label: "Parental responsibility / contact evidence",
			required: true,
		},
		...FINANCIAL,
		ACCOMMODATION,
	],
	ILR_SPOUSE_PARTNER: [
		...IDENTITY,
		...RELATIONSHIP,
		...FINANCIAL,
		...ENGLISH_AND_LIFE,
		RESIDENCE_HISTORY,
	],
	ILR_LONG_RESIDENCE: [
		...IDENTITY,
		RESIDENCE_HISTORY,
		...ENGLISH_AND_LIFE,
		{
			key: "residence-evidence",
			label: "Continuous residence evidence (10 years)",
			required: true,
		},
	],
	ADULT_DEPENDENT_RELATIVE: [
		...IDENTITY,
		{
			key: "care-needs",
			label: "Medical evidence of long-term care needs",
			required: true,
		},
		{
			key: "care-unavailable",
			label: "Evidence care is unavailable in the home country",
			required: true,
		},
		{
			key: "sponsor-finances",
			label: "Sponsor's maintenance and accommodation evidence",
			required: true,
		},
	],
	SPONSOR_LICENCE: [
		{
			key: "incorporation",
			label: "Certificate of incorporation",
			required: true,
		},
		{
			key: "business-bank",
			label: "Corporate bank statement",
			required: true,
		},
		{
			key: "paye-evidence",
			label: "PAYE / HMRC registration evidence",
			required: true,
		},
		{
			key: "premises",
			label: "Business premises evidence",
			required: true,
		},
		{
			key: "key-personnel",
			label: "Key personnel details and right-to-work checks",
			required: true,
		},
	],
	SKILLED_WORKER_VISA: [
		...IDENTITY,
		{
			key: "cos",
			label: "Certificate of Sponsorship reference",
			required: true,
		},
		{
			key: "salary-evidence",
			label: "Salary and going-rate evidence",
			required: true,
		},
		{
			key: "english-test",
			label: "English language evidence",
			required: true,
		},
		TB_TEST,
	],
	SENIOR_SPECIALIST_WORKER: [
		...IDENTITY,
		{
			key: "cos",
			label: "Certificate of Sponsorship reference",
			required: true,
		},
		{
			key: "overseas-employment",
			label: "Overseas group employment evidence (12 months)",
			required: true,
		},
		{
			key: "salary-evidence",
			label: "Salary threshold evidence",
			required: true,
		},
	],
	INNOVATOR_FOUNDER_GLOBAL_TALENT: [
		...IDENTITY,
		{
			key: "endorsement",
			label: "Endorsement letter",
			required: true,
		},
		{
			key: "business-plan",
			label: "Business plan / talent evidence",
			required: true,
		},
		{
			key: "english-test",
			label: "English language evidence",
			required: true,
		},
	],
	ILR_WORK_ROUTE: [
		...IDENTITY,
		RESIDENCE_HISTORY,
		{
			key: "sponsor-letter",
			label: "Sponsor letter confirming ongoing employment",
			required: true,
		},
		{
			key: "salary-evidence",
			label: "Current salary evidence",
			required: true,
		},
		...ENGLISH_AND_LIFE,
	],
	NATURALISATION_ADULT: [
		...IDENTITY,
		RESIDENCE_HISTORY,
		...ENGLISH_AND_LIFE,
		{
			key: "referees",
			label: "Two referee declarations",
			required: true,
		},
	],
	REGISTRATION_BRITISH_CITIZEN_CHILD: [
		{
			key: "child-passport",
			label: "Child's passport",
			required: true,
		},
		{
			key: "child-birth-certificate",
			label: "Child's full birth certificate",
			required: true,
		},
		{
			key: "parent-status",
			label: "Parents' status evidence",
			required: true,
		},
		{
			key: "consent",
			label: "Both parents' consent",
			required: true,
		},
	],
	STUDENT_VISA: [
		...IDENTITY,
		{
			key: "cas",
			label: "CAS reference",
			required: true,
		},
		{
			key: "maintenance-funds",
			label: "Maintenance funds evidence (28 days)",
			required: true,
		},
		{
			key: "qualifications",
			label: "Academic qualifications named on the CAS",
			required: true,
		},
		TB_TEST,
	],
	VISITOR_VISA: [
		...IDENTITY,
		{
			key: "travel-purpose",
			label: "Purpose of visit evidence",
			description: "Invitation letter, bookings, itinerary",
			required: true,
		},
		{
			key: "home-ties",
			label: "Ties to home country",
			description: "Employment, property, family commitments",
			required: true,
		},
		{
			key: "funds",
			label: "Funds for the visit",
			required: true,
		},
	],
	OTHER: [],
} satisfies Record<MatterServiceId, ChecklistTemplateItem[]>;

export function checklistTemplateFor(
	service: MatterServiceId,
): ChecklistTemplateItem[] {
	return DOCUMENT_CHECKLIST_TEMPLATES[service] ?? [];
}
