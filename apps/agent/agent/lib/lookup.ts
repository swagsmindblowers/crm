import { MatterStage, db } from "@crm/db";
import { LOSING_MATTER_STAGES, OPEN_MATTER_STAGES } from "@crm/db/matter-stage";
import { domainOf, normalise } from "./names";

export type RecordKind = "contact" | "company" | "matter";

export type ContactHit = {
	kind: "contact";
	id: string;
	name: string;
	title: string | null;
	email: string | null;
	company: { id: string; name: string } | null;
	lastActivityAt: string | null;
};

export type CompanyHit = {
	kind: "company";
	id: string;
	name: string;
	domain: string | null;
	industry: string | null;
	contacts: number;
	matters: number;
};

export type MatterHit = {
	kind: "matter";
	id: string;
	name: string;
	stage: string;
	amount: number | null;
	currency: string;
	company: { id: string; name: string };
};

export type SearchHit = ContactHit | CompanyHit | MatterHit;

export type SearchResult = {
	query: string;
	contacts: ContactHit[];
	companies: CompanyHit[];
	matters: MatterHit[];
	total: number;
};

export type MatterListStatus = "open" | "won" | "lost" | "all";

export type MatterListOptions = {
	status?: MatterListStatus;
	inactiveForDays?: number;
	companyId?: string;
	ownerId?: string;
	limit?: number;
	cursor?: string;
	now?: Date;
};

export async function listMatters(options: MatterListOptions = {}) {
	const status = options.status ?? "open";
	const limit = Math.min(Math.max(options.limit ?? 50, 1), 100);
	const now = options.now ?? new Date();
	const cutoff =
		options.inactiveForDays === undefined
			? null
			: new Date(
					now.getTime() - Math.max(options.inactiveForDays, 0) * 86_400_000,
				);
	const stages =
		status === "open"
			? [...OPEN_MATTER_STAGES]
			: status === "won"
				? [MatterStage.GRANTED]
				: status === "lost"
					? [...LOSING_MATTER_STAGES]
					: null;

	const rows = await db.matter.findMany({
		where: {
			stage: stages ? { in: stages } : undefined,
			companyId: options.companyId ?? undefined,
			ownerId: options.ownerId ?? undefined,
			OR: cutoff
				? [
						{ lastActivityAt: { lte: cutoff } },
						{ lastActivityAt: null, createdAt: { lte: cutoff } },
					]
				: undefined,
		},
		orderBy: [
			{ lastActivityAt: { sort: "asc", nulls: "first" } },
			{ createdAt: "asc" },
			{ id: "asc" },
		],
		cursor: options.cursor ? { id: options.cursor } : undefined,
		skip: options.cursor ? 1 : undefined,
		take: limit + 1,
		select: {
			id: true,
			name: true,
			stage: true,
			amount: true,
			currency: true,
			createdAt: true,
			lastActivityAt: true,
			expectedCloseDate: true,
			company: {
				select: {
					id: true,
					name: true,
					domain: true,
					iconUrl: true,
					iconDarkUrl: true,
					iconTone: true,
					logoUrl: true,
				},
			},
			owner: { select: { id: true, name: true, email: true, image: true } },
		},
	});
	const hasMore = rows.length > limit;
	const page = rows.slice(0, limit);

	return {
		criteria: {
			status,
			inactiveForDays: options.inactiveForDays ?? null,
			companyId: options.companyId ?? null,
			ownerId: options.ownerId ?? null,
		},
		asOf: now.toISOString(),
		matters: page.map((matter) => {
			const activityDate = matter.lastActivityAt ?? matter.createdAt;
			return {
				id: matter.id,
				name: matter.name,
				stage: matter.stage,
				amount: matter.amount === null ? null : Number(matter.amount),
				currency: matter.currency,
				company: matter.company,
				owner: matter.owner,
				createdAt: matter.createdAt.toISOString(),
				lastActivityAt: matter.lastActivityAt?.toISOString() ?? null,
				daysSinceLastActivity: Math.max(
					0,
					Math.floor((now.getTime() - activityDate.getTime()) / 86_400_000),
				),
				neverActive: matter.lastActivityAt === null,
				expectedCloseDate: matter.expectedCloseDate?.toISOString() ?? null,
			};
		}),
		hasMore,
		nextCursor: hasMore ? page.at(-1)?.id : null,
	};
}

export async function searchCrm(
	query: string,
	options: { kinds?: RecordKind[]; limit?: number } = {},
): Promise<SearchResult> {
	const term = query.trim();
	const kinds = options.kinds ?? ["contact", "company", "matter"];
	const limit = options.limit ?? 10;

	if (term.length < 2) {
		return { query: term, contacts: [], companies: [], matters: [], total: 0 };
	}

	const wants = (kind: RecordKind) => kinds.includes(kind);
	const email = term.includes("@") ? term.toLowerCase() : null;
	const domain = email ? domainOf(email) : bareDomain(term);
	const words = term.split(/\s+/).filter((word) => word.length >= 2);

	const [contacts, companies, matters] = await Promise.all([
		wants("contact") ? searchContacts(term, words, email, limit) : [],
		wants("company") ? searchCompanies(term, words, domain, limit) : [],
		wants("matter") ? searchMatters(term, words, limit) : [],
	]);

	return {
		query: term,
		contacts,
		companies,
		matters,
		total: contacts.length + companies.length + matters.length,
	};
}

async function searchContacts(
	term: string,
	words: string[],
	email: string | null,
	limit: number,
): Promise<ContactHit[]> {
	const contains = words.flatMap((word) => [
		{ firstName: { contains: word, mode: "insensitive" as const } },
		{ lastName: { contains: word, mode: "insensitive" as const } },
		{ email: { contains: word, mode: "insensitive" as const } },
	]);

	const rows = await db.contact.findMany({
		where: {
			OR: [
				...(email
					? [{ email: { equals: email, mode: "insensitive" as const } }]
					: []),
				...contains,
				{ company: { name: { contains: term, mode: "insensitive" as const } } },
			],
		},
		orderBy: [{ lastActivityAt: "desc" }, { createdAt: "asc" }],
		take: limit * 3,
		select: {
			id: true,
			firstName: true,
			lastName: true,
			title: true,
			email: true,
			lastActivityAt: true,
			company: { select: { id: true, name: true } },
		},
	});

	return rows
		.map((row) => {
			const name = [row.firstName, row.lastName].filter(Boolean).join(" ");
			return {
				score: score(term, [name, row.email ?? "", row.company?.name ?? ""]),
				hit: {
					kind: "contact" as const,
					id: row.id,
					name,
					title: row.title,
					email: row.email,
					company: row.company,
					lastActivityAt: row.lastActivityAt?.toISOString() ?? null,
				},
			};
		})
		.sort((a, b) => b.score - a.score)
		.slice(0, limit)
		.map((row) => row.hit);
}

async function searchCompanies(
	term: string,
	words: string[],
	domain: string | null,
	limit: number,
): Promise<CompanyHit[]> {
	const rows = await db.company.findMany({
		where: {
			OR: [
				{ name: { contains: term, mode: "insensitive" } },
				...(domain
					? [{ domain: { contains: domain, mode: "insensitive" as const } }]
					: []),
				...words.map((word) => ({
					name: { contains: word, mode: "insensitive" as const },
				})),
			],
		},
		orderBy: [{ lastActivityAt: "desc" }, { name: "asc" }],
		take: limit * 3,
		select: {
			id: true,
			name: true,
			domain: true,
			industry: true,
			_count: { select: { contacts: true, matters: true } },
		},
	});

	return rows
		.map((row) => ({
			score: score(term, [row.name, row.domain ?? ""]),
			hit: {
				kind: "company" as const,
				id: row.id,
				name: row.name,
				domain: row.domain,
				industry: row.industry,
				contacts: row._count.contacts,
				matters: row._count.matters,
			},
		}))
		.sort((a, b) => b.score - a.score)
		.slice(0, limit)
		.map((row) => row.hit);
}

async function searchMatters(
	term: string,
	words: string[],
	limit: number,
): Promise<MatterHit[]> {
	const rows = await db.matter.findMany({
		where: {
			OR: [
				{ name: { contains: term, mode: "insensitive" } },
				...words.map((word) => ({
					name: { contains: word, mode: "insensitive" as const },
				})),
				{ company: { name: { contains: term, mode: "insensitive" } } },
			],
		},
		orderBy: [{ lastActivityAt: "desc" }, { createdAt: "desc" }],
		take: limit * 3,
		select: {
			id: true,
			name: true,
			stage: true,
			amount: true,
			currency: true,
			company: { select: { id: true, name: true } },
		},
	});

	return rows
		.map((row) => ({
			score: score(term, [row.name, row.company.name]),
			hit: {
				kind: "matter" as const,
				id: row.id,
				name: row.name,
				stage: row.stage,
				amount: row.amount === null ? null : Number(row.amount),
				currency: row.currency,
				company: row.company,
			},
		}))
		.sort((a, b) => b.score - a.score)
		.slice(0, limit)
		.map((row) => row.hit);
}

function score(term: string, fields: string[]): number {
	const needle = normalise(term);
	if (!needle) return 0;

	let best = 0;
	for (const field of fields) {
		const hay = normalise(field);
		if (!hay) continue;
		if (hay === needle) best = Math.max(best, 4);
		else if (hay.startsWith(needle)) best = Math.max(best, 3);
		else if (hay.includes(needle)) best = Math.max(best, 2);
	}
	if (best > 0) return best;

	const words = term
		.split(/\s+/)
		.map(normalise)
		.filter((word) => word.length >= 2);
	if (words.length === 0) return 0;

	const hay = fields.map(normalise).join(" ");
	return words.filter((word) => hay.includes(word)).length / words.length;
}

function bareDomain(term: string): string | null {
	const candidate = term
		.trim()
		.toLowerCase()
		.replace(/^https?:\/\//, "");
	return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(candidate) ? candidate : null;
}
