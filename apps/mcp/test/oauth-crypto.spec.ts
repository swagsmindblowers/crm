import { describe, expect, it } from "bun:test";
import {
	type CodePayload,
	decryptCode,
	encryptCode,
} from "../src/oauth/crypto";

function payload(overrides: Partial<CodePayload> = {}): CodePayload {
	return {
		apiKey: "crm_test_key",
		codeChallenge: "challenge",
		redirectUri: "https://claude.ai/callback",
		exp: Date.now() + 60_000,
		...overrides,
	};
}

describe("encryptCode / decryptCode", () => {
	it("round-trips a payload", async () => {
		const original = payload();
		const code = await encryptCode(original);
		const decoded = await decryptCode(code);

		expect(decoded).toEqual(original);
	});

	it("rejects a tampered code", async () => {
		const code = await encryptCode(payload());
		const tampered = `${code.slice(0, -4)}${code.slice(-4) === "AAAA" ? "BBBB" : "AAAA"}`;

		expect(await decryptCode(tampered)).toBeNull();
	});

	it("rejects an expired code", async () => {
		const code = await encryptCode(payload({ exp: Date.now() - 1000 }));

		expect(await decryptCode(code)).toBeNull();
	});

	it("rejects garbage input", async () => {
		expect(await decryptCode("not-a-real-code")).toBeNull();
	});
});
