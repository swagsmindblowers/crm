import { z } from "zod";
import { MCP_CONFIG, oauthConfigured } from "../config";
import { authorizeErrorPage, renderAuthorizePage } from "./authorize-page";
import { type CodePayload, decryptCode, encryptCode } from "./crypto";
import {
	authorizationServerMetadata,
	protectedResourceMetadata,
} from "./metadata";
import { verifyCodeChallenge } from "./pkce";
import { verifyApiKey } from "./verify-api-key";

function notConfigured(): Response {
	return Response.json(
		{
			error: "temporarily_unavailable",
			message: "OAuth sign-in is not configured on this MCP server.",
		},
		{ status: 503 },
	);
}

export function handleWellKnownAuthorizationServer(request: Request): Response {
	const origin = new URL(request.url).origin;
	return Response.json(authorizationServerMetadata(origin));
}

export function handleWellKnownProtectedResource(request: Request): Response {
	const origin = new URL(request.url).origin;
	return Response.json(protectedResourceMetadata(origin));
}

export function handleRegisterProbe(): Response {
	if (!oauthConfigured()) return notConfigured();

	return Response.json({
		token_endpoint_auth_methods_supported: ["none"],
		grant_types_supported: ["authorization_code"],
		response_types_supported: ["code"],
	});
}

const registerBody = z.object({
	redirect_uris: z.array(z.string()).min(1),
	client_name: z.string().optional(),
});

export async function handleRegister(request: Request): Promise<Response> {
	if (!oauthConfigured()) return notConfigured();

	const parsed = registerBody.safeParse(await request.json().catch(() => null));
	if (!parsed.success) {
		return Response.json(
			{
				error: "invalid_client_metadata",
				error_description: "redirect_uris is required.",
			},
			{ status: 400 },
		);
	}

	return Response.json(
		{
			client_id: crypto.randomUUID(),
			client_id_issued_at: Math.floor(Date.now() / 1000),
			client_name: parsed.data.client_name ?? "MCP client",
			redirect_uris: parsed.data.redirect_uris,
			token_endpoint_auth_method: "none",
			grant_types: ["authorization_code"],
			response_types: ["code"],
		},
		{ status: 201 },
	);
}

const authorizeQuery = z.object({
	response_type: z.literal("code"),
	client_id: z.string().min(1),
	redirect_uri: z.string().min(1),
	state: z.string().min(1),
	code_challenge: z.string().min(1),
	code_challenge_method: z.literal("S256"),
});

export function handleAuthorizeGet(request: Request): Response {
	if (!oauthConfigured()) return notConfigured();

	const parsed = authorizeQuery.safeParse(
		Object.fromEntries(new URL(request.url).searchParams),
	);
	if (!parsed.success) return authorizeErrorPage();

	return new Response(
		renderAuthorizePage({
			responseType: parsed.data.response_type,
			clientId: parsed.data.client_id,
			redirectUri: parsed.data.redirect_uri,
			state: parsed.data.state,
			codeChallenge: parsed.data.code_challenge,
		}),
		{ headers: { "content-type": "text/html; charset=utf-8" } },
	);
}

const authorizeForm = z.object({
	apiKey: z.string().min(1),
	response_type: z.string(),
	client_id: z.string(),
	redirect_uri: z.string().min(1),
	state: z.string(),
	code_challenge: z.string().min(1),
});

export async function handleAuthorizePost(request: Request): Promise<Response> {
	if (!oauthConfigured()) return notConfigured();

	const parsed = authorizeForm.safeParse(
		Object.fromEntries(await request.formData()),
	);
	if (!parsed.success) return authorizeErrorPage();

	const query = {
		responseType: parsed.data.response_type,
		clientId: parsed.data.client_id,
		redirectUri: parsed.data.redirect_uri,
		state: parsed.data.state,
		codeChallenge: parsed.data.code_challenge,
	};

	const check = await verifyApiKey(parsed.data.apiKey);
	if (!check.ok) {
		return new Response(renderAuthorizePage(query, check.reason), {
			status: 400,
			headers: { "content-type": "text/html; charset=utf-8" },
		});
	}

	const payload: CodePayload = {
		apiKey: parsed.data.apiKey,
		codeChallenge: query.codeChallenge,
		redirectUri: query.redirectUri,
		exp: Date.now() + MCP_CONFIG.oauth.codeTtlMs,
	};
	const code = await encryptCode(payload);

	const redirect = new URL(query.redirectUri);
	redirect.searchParams.set("code", code);
	redirect.searchParams.set("state", query.state);

	return Response.redirect(redirect.toString(), 302);
}

const tokenForm = z.object({
	grant_type: z.literal("authorization_code"),
	code: z.string().min(1),
	redirect_uri: z.string().optional(),
	code_verifier: z.string().min(1),
});

export async function handleToken(request: Request): Promise<Response> {
	if (!oauthConfigured()) return notConfigured();

	const body = await request
		.formData()
		.then((form) => Object.fromEntries(form))
		.catch(() => null);
	const parsed = tokenForm.safeParse(body);
	if (!parsed.success) {
		return Response.json({ error: "invalid_request" }, { status: 400 });
	}

	const payload = await decryptCode(parsed.data.code);
	if (!payload) {
		return Response.json({ error: "invalid_grant" }, { status: 400 });
	}

	if (
		parsed.data.redirect_uri &&
		parsed.data.redirect_uri !== payload.redirectUri
	) {
		return Response.json({ error: "invalid_grant" }, { status: 400 });
	}

	const verified = await verifyCodeChallenge(
		parsed.data.code_verifier,
		payload.codeChallenge,
	);
	if (!verified) {
		return Response.json({ error: "invalid_grant" }, { status: 400 });
	}

	return Response.json({
		access_token: payload.apiKey,
		token_type: "bearer",
	});
}
