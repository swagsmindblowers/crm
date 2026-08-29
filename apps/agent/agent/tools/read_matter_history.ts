import { defineTool } from "eve/tools";
import { z } from "zod";
import { readMatterHistory } from "../lib/accounts";
import { focusOn } from "../lib/focus";

export default defineTool({
	description:
		"Read a matter in full: stage and how long it has been there, value, close date, the whole stage history, who is on it with their contact ids, the correspondence and meetings with those people, and the notes. Free — call it first in a matter session.",
	inputSchema: z.object({
		matterId: z.string(),
		threads: z
			.number()
			.int()
			.min(1)
			.max(20)
			.default(5)
			.describe("How many recent threads to read."),
	}),
	async execute({ matterId, threads }) {
		const history = await readMatterHistory(matterId, { threads });
		if (!history) return { found: false as const, reason: "No such matter." };

		focusOn({ companyId: history.company.id });

		return { found: true as const, ...history };
	},
});
