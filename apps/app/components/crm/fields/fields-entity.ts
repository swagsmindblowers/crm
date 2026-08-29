import type { RecordKind } from "@/components/crm/record-sheet/record-stack";

export type FieldEntity = "COMPANY" | "CONTACT" | "MATTER";

const TO_ENTITY = {
	company: "COMPANY",
	contact: "CONTACT",
	matter: "MATTER",
} satisfies Record<RecordKind, FieldEntity>;

const TO_KIND = {
	COMPANY: "company",
	CONTACT: "contact",
	MATTER: "matter",
} satisfies Record<FieldEntity, RecordKind>;

export function entityOf(kind: RecordKind): FieldEntity {
	return TO_ENTITY[kind];
}

export function kindOf(entity: FieldEntity): RecordKind {
	return TO_KIND[entity];
}
