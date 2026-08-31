import { z } from "zod";
import { API_URL } from "@/lib/env";

export type PortalUploadResult = { ok: true } | { ok: false; reason: string };

const errorBody = z.object({ message: z.string() });

export async function uploadPortalDocument(
	matterId: string,
	checklistItemId: string,
	file: File,
): Promise<PortalUploadResult> {
	const body = new FormData();
	body.set("file", file);

	const response = await fetch(
		`${API_URL}/api/client-portal/matters/${matterId}/documents/${checklistItemId}/uploads`,
		{ method: "POST", body, credentials: "include" },
	);

	if (response.ok) return { ok: true };

	const parsed = errorBody.safeParse(await response.json().catch(() => null));

	return {
		ok: false,
		reason: parsed.success ? parsed.data.message : "Could not upload the file.",
	};
}
