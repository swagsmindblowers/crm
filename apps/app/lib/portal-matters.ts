import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";
import { API_URL } from "@/lib/env";

const clientMatterStatus = z.enum([
	"in_progress",
	"submitted",
	"decision_pending",
	"approved",
	"not_approved",
	"withdrawn",
]);

export type ClientMatterStatus = z.infer<typeof clientMatterStatus>;

const portalMatterList = z.object({
	matters: z.array(
		z.object({
			id: z.string(),
			name: z.string(),
			companyName: z.string(),
			status: clientMatterStatus,
			statusLabel: z.string(),
		}),
	),
});

export type PortalMatter = z.infer<typeof portalMatterList>["matters"][number];

const portalChecklistUpload = z.object({
	id: z.string(),
	filename: z.string(),
	reviewStatus: z.enum(["PENDING_REVIEW", "ACCEPTED", "REJECTED"]),
	reviewNote: z.string().nullable(),
	createdAt: z.string(),
});

const portalChecklistItem = z.object({
	id: z.string(),
	label: z.string(),
	description: z.string().nullable(),
	required: z.boolean(),
	status: z.enum(["outstanding", "received"]),
	uploads: z.array(portalChecklistUpload),
});

const portalMatterDetail = z.object({
	id: z.string(),
	name: z.string(),
	companyName: z.string(),
	status: clientMatterStatus,
	statusLabel: z.string(),
	checklist: z.array(portalChecklistItem),
});

export type PortalMatterDetail = z.infer<typeof portalMatterDetail>;
export type PortalChecklistItem = z.infer<typeof portalChecklistItem>;

async function portalFetch(path: string): Promise<Response> {
	const cookie = (await cookies()).toString();
	return fetch(`${API_URL}${path}`, {
		headers: cookie ? { cookie } : {},
		cache: "no-store",
	});
}

export async function listPortalMatters(): Promise<PortalMatter[]> {
	const response = await portalFetch("/api/client-portal/matters");
	if (!response.ok) return [];

	const parsed = portalMatterList.safeParse(await response.json());
	return parsed.success ? parsed.data.matters : [];
}

export async function getPortalMatter(
	matterId: string,
): Promise<PortalMatterDetail | null> {
	const response = await portalFetch(
		`/api/client-portal/matters/${encodeURIComponent(matterId)}`,
	);
	if (!response.ok) return null;

	const parsed = portalMatterDetail.safeParse(await response.json());
	return parsed.success ? parsed.data : null;
}
