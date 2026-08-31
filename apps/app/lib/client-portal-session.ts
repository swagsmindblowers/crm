import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";
import { API_URL } from "@/lib/env";

const clientSession = z.object({
	clientAccountId: z.string(),
	contactId: z.string(),
	email: z.string(),
});

export type ClientSession = z.infer<typeof clientSession>;

export async function readClientSession(): Promise<ClientSession | null> {
	const cookie = (await cookies()).toString();
	if (!cookie) return null;

	try {
		const response = await fetch(`${API_URL}/api/client-portal/me`, {
			headers: { cookie },
			cache: "no-store",
		});
		if (!response.ok) return null;

		const parsed = clientSession.safeParse(await response.json());
		return parsed.success ? parsed.data : null;
	} catch {
		return null;
	}
}
