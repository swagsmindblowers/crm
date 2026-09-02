export type AuthorizationServerMetadata = {
	issuer: string;
	authorization_endpoint: string;
	token_endpoint: string;
	registration_endpoint: string;
	response_types_supported: string[];
	grant_types_supported: string[];
	code_challenge_methods_supported: string[];
	token_endpoint_auth_methods_supported: string[];
};

export type ProtectedResourceMetadata = {
	resource: string;
	authorization_servers: string[];
	bearer_methods_supported: string[];
};

export function authorizationServerMetadata(
	origin: string,
): AuthorizationServerMetadata {
	return {
		issuer: origin,
		authorization_endpoint: `${origin}/authorize`,
		token_endpoint: `${origin}/token`,
		registration_endpoint: `${origin}/register`,
		response_types_supported: ["code"],
		grant_types_supported: ["authorization_code"],
		code_challenge_methods_supported: ["S256"],
		token_endpoint_auth_methods_supported: ["none"],
	};
}

export function protectedResourceMetadata(
	origin: string,
): ProtectedResourceMetadata {
	return {
		resource: `${origin}/mcp`,
		authorization_servers: [origin],
		bearer_methods_supported: ["header"],
	};
}
