import { describe, expect, it } from "bun:test";
import { verifyCodeChallenge } from "../src/oauth/pkce";

async function challengeFor(verifier: string): Promise<string> {
	const digest = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(verifier),
	);
	let binary = "";
	for (const byte of new Uint8Array(digest))
		binary += String.fromCharCode(byte);
	return btoa(binary)
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
}

describe("verifyCodeChallenge", () => {
	it("accepts the verifier that produced the challenge", async () => {
		const verifier = "a-real-pkce-verifier-string-1234567890";
		const challenge = await challengeFor(verifier);

		expect(await verifyCodeChallenge(verifier, challenge)).toBe(true);
	});

	it("rejects a verifier that does not match", async () => {
		const challenge = await challengeFor("the-real-verifier");

		expect(await verifyCodeChallenge("a-different-verifier", challenge)).toBe(
			false,
		);
	});
});
