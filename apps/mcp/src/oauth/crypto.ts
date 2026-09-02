import { MCP_CONFIG } from "../config";
import { fromBase64Url, toBase64Url } from "./base64url";

export type CodePayload = {
	apiKey: string;
	codeChallenge: string;
	redirectUri: string;
	exp: number;
};

async function deriveKey(secret: string): Promise<CryptoKey> {
	const digest = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(secret),
	);
	return crypto.subtle.importKey("raw", digest, "AES-GCM", false, [
		"encrypt",
		"decrypt",
	]);
}

export async function encryptCode(payload: CodePayload): Promise<string> {
	const secret = MCP_CONFIG.oauth.secret;
	if (!secret) throw new Error("MCP_OAUTH_SECRET is not set.");

	const key = await deriveKey(secret);
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const plaintext = new TextEncoder().encode(JSON.stringify(payload));

	const ciphertext = new Uint8Array(
		await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext),
	);

	const combined = new Uint8Array(iv.length + ciphertext.length);
	combined.set(iv, 0);
	combined.set(ciphertext, iv.length);

	return toBase64Url(combined);
}

export async function decryptCode(code: string): Promise<CodePayload | null> {
	const secret = MCP_CONFIG.oauth.secret;
	if (!secret) return null;

	try {
		const key = await deriveKey(secret);
		const combined = fromBase64Url(code);
		const iv = combined.slice(0, 12);
		const ciphertext = combined.slice(12);

		const plaintext = await crypto.subtle.decrypt(
			{ name: "AES-GCM", iv },
			key,
			ciphertext,
		);

		const payload = JSON.parse(
			new TextDecoder().decode(plaintext),
		) as CodePayload;
		if (payload.exp < Date.now()) return null;

		return payload;
	} catch {
		return null;
	}
}
