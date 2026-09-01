import { MCP_CONFIG } from "./config";

export class RestApiError extends Error {
	readonly status: number;

	constructor(status: number, message: string) {
		super(message);
		this.status = status;
	}
}

export type RestMethod = "GET" | "POST" | "PATCH";

export async function restRequest<T, B = never>(
	apiKey: string,
	method: RestMethod,
	path: string,
	body?: B,
): Promise<T> {
	const response = await fetch(`${MCP_CONFIG.api.baseUrl}${path}`, {
		method,
		headers: {
			"x-api-key": apiKey,
			"content-type": "application/json",
		},
		body: body === undefined ? undefined : JSON.stringify(body),
	});

	if (!response.ok) {
		const text = await response.text().catch(() => "");
		throw new RestApiError(
			response.status,
			describeError(response.status, text),
		);
	}

	if (response.status === 204) return undefined as T;
	return (await response.json()) as T;
}

function describeError(status: number, body: string): string {
	try {
		const parsed = JSON.parse(body) as {
			message?: string;
			issues?: { path: (string | number)[]; message: string }[];
		};
		if (parsed.issues?.length) {
			const details = parsed.issues
				.map((issue) => `${issue.path.join(".")}: ${issue.message}`)
				.join("; ");
			return `${parsed.message ?? "Input validation failed"} (${details})`;
		}
		if (parsed.message) return parsed.message;
	} catch {}

	return body || `Request failed with status ${status}.`;
}
