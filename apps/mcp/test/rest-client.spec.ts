import { afterEach, describe, expect, it, mock } from "bun:test";
import { RestApiError, restRequest } from "../src/rest-client";

const originalFetch = globalThis.fetch;

afterEach(() => {
	globalThis.fetch = originalFetch;
});

describe("restRequest", () => {
	it("sends the api key and body to the rest bridge", async () => {
		const fetchMock = mock(async (url: string, init: RequestInit) => {
			expect(url).toContain("/rest/matters/search");
			expect(init.method).toBe("POST");
			expect((init.headers as Record<string, string>)["x-api-key"]).toBe(
				"crm_test",
			);
			expect(init.body).toBe(JSON.stringify({ q: "smith" }));
			return new Response(JSON.stringify({ rows: [], total: 0 }), {
				status: 200,
			});
		});
		globalThis.fetch = fetchMock as unknown as typeof fetch;

		const result = await restRequest("crm_test", "POST", "/matters/search", {
			q: "smith",
		});

		expect(result).toEqual({ rows: [], total: 0 });
	});

	it("throws a RestApiError carrying the validation issues", async () => {
		globalThis.fetch = mock(
			async () =>
				new Response(
					JSON.stringify({
						message: "Input validation failed",
						issues: [{ path: ["data"], message: "expected object" }],
					}),
					{ status: 400 },
				),
		) as unknown as typeof fetch;

		await expect(
			restRequest("crm_test", "PATCH", "/matters/1", {}),
		).rejects.toThrow(/data: expected object/);
	});

	it("wraps a non-json error body without throwing during parsing", async () => {
		globalThis.fetch = mock(
			async () => new Response("Gateway timeout", { status: 504 }),
		) as unknown as typeof fetch;

		const error = await restRequest("crm_test", "GET", "/matters/1").catch(
			(cause) => cause as RestApiError,
		);

		expect(error).toBeInstanceOf(RestApiError);
		expect((error as RestApiError).status).toBe(504);
		expect((error as RestApiError).message).toBe("Gateway timeout");
	});

	it("returns undefined for a 204 response instead of parsing an empty body", async () => {
		globalThis.fetch = mock(
			async () => new Response(null, { status: 204 }),
		) as unknown as typeof fetch;

		const result = await restRequest("crm_test", "GET", "/matters/1");

		expect(result).toBeUndefined();
	});
});
