export type AuthorizePageParams = {
	responseType: string;
	clientId: string;
	redirectUri: string;
	state: string;
	codeChallenge: string;
};

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

export function authorizeErrorPage(): Response {
	return new Response(
		"This authorization request is missing required parameters, or asked for a code challenge method this server doesn't support (only S256).",
		{ status: 400, headers: { "content-type": "text/plain; charset=utf-8" } },
	);
}

export function renderAuthorizePage(
	params: AuthorizePageParams,
	error?: string,
): string {
	const hidden = [
		["response_type", params.responseType],
		["client_id", params.clientId],
		["redirect_uri", params.redirectUri],
		["state", params.state],
		["code_challenge", params.codeChallenge],
		["code_challenge_method", "S256"],
	]
		.map(
			([name, value]) =>
				`<input type="hidden" name="${name}" value="${escapeHtml(value ?? "")}">`,
		)
		.join("\n");

	return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Connect to MyLegalXpert</title>
<style>
	body { font-family: system-ui, sans-serif; max-width: 28rem; margin: 4rem auto; padding: 0 1rem; color: #1a1a1a; }
	h1 { font-size: 1.25rem; }
	p { color: #555; line-height: 1.5; }
	input[type="password"] { width: 100%; padding: 0.6rem; font-size: 1rem; border: 1px solid #ccc; border-radius: 5px; box-sizing: border-box; }
	button { margin-top: 1rem; padding: 0.6rem 1.2rem; font-size: 1rem; background: #1F3A66; color: white; border: none; border-radius: 5px; cursor: pointer; }
	.error { color: #b3261e; margin-top: 0.5rem; }
	a { color: #1F3A66; }
</style>
</head>
<body>
<h1>Connect to MyLegalXpert</h1>
<p>Paste a personal CRM API key to let this client access matters, contacts, companies and documents on your behalf. Mint one at <strong>Settings → API keys</strong> if you don't have one.</p>
<form method="post">
${hidden}
<input type="password" name="apiKey" placeholder="crm_..." autofocus required>
${error ? `<p class="error">${escapeHtml(error)}</p>` : ""}
<button type="submit">Connect</button>
</form>
</body>
</html>`;
}
