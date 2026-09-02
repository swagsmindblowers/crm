import { MCP_CONFIG } from "../config";

export type ApiKeyCheck =
	| { ok: true; userName: string }
	| { ok: false; reason: string };

export async function verifyApiKey(apiKey: string): Promise<ApiKeyCheck> {
	const response = await fetch(`${MCP_CONFIG.api.url}/auth/me`, {
		headers: { "x-api-key": apiKey },
	}).catch(() => null);

	if (!response) {
		return { ok: false, reason: "Could not reach the CRM to check that key." };
	}
	if (!response.ok) {
		return {
			ok: false,
			reason: "That key was not accepted. Check it and try again.",
		};
	}

	const body = (await response.json().catch(() => null)) as {
		user?: { name?: string };
	} | null;

	return { ok: true, userName: body?.user?.name ?? "your account" };
}
