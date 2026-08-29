import { ActivityType, db } from "@crm/db";
import { defineTool } from "eve/tools";
import { z } from "zod";
import { enabled, unavailable } from "../lib/capabilities";
import { spend } from "../lib/focus";
import { ask } from "../lib/perplexity";

const GUIDANCE_DOMAINS = ["gov.uk"];

export default defineTool({
	description:
		"Research current UK Home Office/UKVI processing times and policy guidance for a matter's service type, from public gov.uk sources. Writes the answer to the matter's timeline. This is NEVER a case-status lookup — there is no API for that, and the tool must never claim to know how a specific application is progressing. It answers general questions like 'what is the current processing time for a Skilled Worker visa' or 'has the minimum salary threshold changed'.",
	inputSchema: z.object({
		matterId: z.string(),
		question: z
			.string()
			.describe(
				"A specific public-guidance question, e.g. 'What is the current UKVI processing time for a Skilled Worker visa extension?' Never phrase this as a question about this specific applicant's case.",
			),
	}),
	async execute({ matterId, question }) {
		if (!(await enabled("PERPLEXITY_API_KEY")))
			return unavailable("PERPLEXITY_API_KEY");

		const matter = await db.matter.findUnique({
			where: { id: matterId },
			select: { id: true, name: true, companyId: true, ownerId: true },
		});

		if (!matter) return { ok: false as const, reason: "No such matter." };

		const charge = spend(1);
		if (!charge.ok) return { ok: false as const, reason: charge.reason };

		const answer = await ask(question, {
			domains: GUIDANCE_DOMAINS,
			system:
				"You answer questions about UK Home Office/UKVI processing times and " +
				"published immigration policy guidance, for a UK immigration solicitor. " +
				"Answer only from gov.uk and other official published guidance. State " +
				"only what your sources support and say plainly when guidance is silent " +
				"or unclear. You have no access to any specific applicant's case status " +
				"— never imply you checked one, and never invent a processing outcome.",
		});

		if (!answer.ok) return { ok: false as const, reason: answer.reason };

		const activity = await db.activity.create({
			data: {
				type: ActivityType.ENRICHMENT,
				subject: `UKVI guidance — ${matter.name}`,
				body: answer.data.text,
				occurredAt: new Date(),
				matterId: matter.id,
				companyId: matter.companyId,
				createdById: matter.ownerId,
				meta: {
					source: "perplexity",
					question,
					citations: answer.data.citations,
				},
			},
			select: { id: true },
		});

		await db.matter.update({
			where: { id: matterId },
			data: { lastActivityAt: new Date() },
		});

		return {
			ok: true as const,
			activityId: activity.id,
			answer: answer.data.text,
			citations: answer.data.citations,
			note: "Public guidance research only — not a case-status check. Only write claims that have a citation.",
		};
	},
});
