import { z } from "zod";

export const grantAccessInput = z.object({ contactId: z.string() });

export const clientAccountOutput = z.object({
	id: z.string(),
	contactId: z.string(),
	email: z.string(),
});

export type ClientAccountResult = z.infer<typeof clientAccountOutput>;

export const issueLoginLinkInput = z.object({ contactId: z.string() });

export const issueLoginLinkOutput = z.object({
	sent: z.boolean(),
	link: z.string().nullable(),
});

export type IssueLoginLinkResult = z.infer<typeof issueLoginLinkOutput>;

export const requestMagicLinkInput = z.object({ email: z.email() });
