import { defineTool } from "eve/tools";
import { z } from "zod";
import { listMatters } from "../lib/lookup";

export default defineTool({
	description:
		"List matters across the CRM with pipeline status and inactivity filters. Use this for broad requests such as all open matters, stale matters, matters untouched for a number of days, or a pipeline sweep. Results are oldest-touch first and paginated; continue with nextCursor while hasMore is true. Free.",
	inputSchema: z.object({
		status: z.enum(["open", "won", "lost", "all"]).default("open"),
		inactiveForDays: z
			.number()
			.int()
			.min(0)
			.max(3650)
			.optional()
			.describe(
				"Return matters whose last activity was at least this many days ago. Matters with no activity qualify once they are this old.",
			),
		companyId: z.string().optional(),
		ownerId: z.string().optional(),
		limit: z.number().int().min(1).max(100).default(50),
		cursor: z.string().optional(),
	}),
	async execute(input) {
		return listMatters(input);
	},
	toModelOutput(output) {
		return {
			type: "json",
			value: {
				...output,
				matters: output.matters.map((matter) => ({
					...matter,
					company: { id: matter.company.id, name: matter.company.name },
					owner: matter.owner
						? {
								id: matter.owner.id,
								name: matter.owner.name,
								email: matter.owner.email,
							}
						: null,
				})),
			},
		};
	},
});
