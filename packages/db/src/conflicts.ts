import type { Db } from "./client";
import { ConflictCheckStatus } from "./generated/prisma/enums";

export type ConflictMatch = {
	kind: "contact" | "matter";
	id: string;
	label: string;
	matchedOn: "name" | "employer" | "relatedParty";
	detail: string;
};

export type ConflictCheckTarget = {
	contactId?: string | null;
	matterId?: string | null;
	checkedById?: string | null;
};

export type ConflictCheckResult = {
	id: string;
	status: ConflictCheckStatus;
	matches: ConflictMatch[];
};

function fullName(contact: {
	firstName: string;
	lastName: string | null;
}): string {
	return [contact.firstName, contact.lastName ?? ""]
		.join(" ")
		.replace(/\s+/g, " ")
		.trim()
		.toLowerCase();
}

export async function runConflictCheck(
	db: Db,
	target: ConflictCheckTarget,
): Promise<ConflictCheckResult> {
	const contactIds = new Set<string>();
	if (target.contactId) contactIds.add(target.contactId);

	if (target.matterId) {
		const attached = await db.matterContact.findMany({
			where: { matterId: target.matterId },
			select: { contactId: true },
		});
		for (const row of attached) contactIds.add(row.contactId);
	}

	const targets = await db.contact.findMany({
		where: { id: { in: [...contactIds] } },
		select: {
			id: true,
			firstName: true,
			lastName: true,
			companyId: true,
			company: { select: { name: true } },
		},
	});

	const matches: ConflictMatch[] = [];
	const seen = new Set<string>();

	const push = (match: ConflictMatch) => {
		const key = `${match.kind}:${match.id}:${match.matchedOn}`;
		if (seen.has(key)) return;
		seen.add(key);
		matches.push(match);
	};

	for (const contact of targets) {
		const name = fullName(contact);
		if (name) {
			const namesakes = await db.contact.findMany({
				where: {
					id: { notIn: [...contactIds] },
					archivedAt: null,
					firstName: { equals: contact.firstName, mode: "insensitive" },
					lastName:
						contact.lastName === null
							? null
							: { equals: contact.lastName, mode: "insensitive" },
				},
				select: {
					id: true,
					firstName: true,
					lastName: true,
					company: { select: { name: true } },
					matters: {
						select: { matter: { select: { id: true, name: true } } },
						take: 3,
					},
				},
				take: 10,
			});

			for (const namesake of namesakes) {
				const where = namesake.company ? ` at ${namesake.company.name}` : "";
				push({
					kind: "contact",
					id: namesake.id,
					label: `${namesake.firstName} ${namesake.lastName ?? ""}`.trim(),
					matchedOn: "name",
					detail: `An existing contact${where} has the same name.`,
				});
				for (const link of namesake.matters) {
					push({
						kind: "matter",
						id: link.matter.id,
						label: link.matter.name,
						matchedOn: "name",
						detail: `A contact with the same name is on this matter.`,
					});
				}
			}
		}

		if (contact.companyId) {
			const others = await db.matter.findMany({
				where: {
					companyId: contact.companyId,
					archivedAt: null,
					id: target.matterId ? { not: target.matterId } : undefined,
					contacts: { none: { contactId: { in: [...contactIds] } } },
				},
				select: { id: true, name: true },
				take: 10,
			});

			for (const matter of others) {
				push({
					kind: "matter",
					id: matter.id,
					label: matter.name,
					matchedOn: "employer",
					detail: `The firm already acts on a matter at ${contact.company?.name ?? "this company"} for a different client.`,
				});
			}

			const relatedParties = await db.matterContact.findMany({
				where: {
					role: { not: null },
					contactId: { notIn: [...contactIds] },
					matter: {
						archivedAt: null,
						companyId: contact.companyId,
						id: target.matterId ? { not: target.matterId } : undefined,
					},
				},
				select: {
					role: true,
					contact: { select: { id: true, firstName: true, lastName: true } },
					matter: { select: { id: true, name: true } },
				},
				take: 10,
			});

			for (const party of relatedParties) {
				push({
					kind: "matter",
					id: party.matter.id,
					label: party.matter.name,
					matchedOn: "relatedParty",
					detail: `${party.contact.firstName} ${party.contact.lastName ?? ""} is on this matter as ${party.role}.`.replace(
						/\s+/g,
						" ",
					),
				});
			}
		}
	}

	const status =
		matches.length > 0
			? ConflictCheckStatus.POTENTIAL_CONFLICT
			: ConflictCheckStatus.CLEAR;

	const row = await db.conflictCheck.create({
		data: {
			matterId: target.matterId ?? null,
			contactId: target.contactId ?? null,
			status,
			matches: matches as object[],
			checkedById: target.checkedById ?? null,
		},
		select: { id: true, status: true },
	});

	return { id: row.id, status: row.status, matches };
}
