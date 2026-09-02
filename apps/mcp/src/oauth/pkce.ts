import { toBase64Url } from "./base64url";

export async function verifyCodeChallenge(
	verifier: string,
	challenge: string,
): Promise<boolean> {
	const digest = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(verifier),
	);
	return toBase64Url(new Uint8Array(digest)) === challenge;
}
