import { z } from "zod";

export const intakeSubmission = z.object({
	formId: z.string().trim().min(1, "formId is required."),
	submittedAt: z.string().trim().min(1).optional(),
	applicant: z.object({
		firstName: z.string().trim().min(1, "First name is required."),
		lastName: z.string().trim().nullable().optional(),
		email: z.string().trim().email("A usable email address is required."),
		phone: z.string().trim().nullable().optional(),
	}),
	serviceType: z.string().trim().nullable().optional(),
	fields: z.record(z.string(), z.string()).default({}),
});

export type IntakeSubmission = z.infer<typeof intakeSubmission>;

export const intakeStatusOutput = z.object({
	configured: z.boolean(),
	endpointPath: z.literal("/api/intake/submissions"),
	recent: z.array(
		z.object({
			id: z.string(),
			email: z.string().nullable(),
			filedAt: z.string().nullable(),
			skipReason: z.string().nullable(),
			createdAt: z.string(),
		}),
	),
});
