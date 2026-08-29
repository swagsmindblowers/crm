export type CrmEventRecordKind = "company" | "contact" | "matter";

type CrmEventDefinition = {
	label: string;
	description: string;
	recordKind: CrmEventRecordKind;
};

export const CRM_EVENT_CATALOG = {
	"company.created": {
		label: "Company created",
		description: "A company is added to the CRM",
		recordKind: "company",
	},
	"contact.created": {
		label: "Contact created",
		description: "A contact is added to the CRM",
		recordKind: "contact",
	},
	"matter.created": {
		label: "Matter created",
		description: "A matter is added to the CRM",
		recordKind: "matter",
	},
	"matter.stage.changed": {
		label: "Matter stage changed",
		description: "A matter moves from one pipeline stage to another",
		recordKind: "matter",
	},
	"matter.opened": {
		label: "Matter opened",
		description: "A closed matter returns to the open pipeline",
		recordKind: "matter",
	},
	"matter.closed": {
		label: "Matter closed",
		description: "An open matter moves to a closed stage",
		recordKind: "matter",
	},
} as const satisfies Record<string, CrmEventDefinition>;

export type CrmEventType = keyof typeof CRM_EVENT_CATALOG;

export const CRM_EVENT_TYPES = Object.keys(CRM_EVENT_CATALOG) as [
	CrmEventType,
	...CrmEventType[],
];
