import {
	CLIENT_SESSION_COOKIE_NAME,
	cookieDomain,
	isProduction,
} from "@crm/auth";
import {
	Body,
	Controller,
	Get,
	HttpCode,
	Post,
	Req,
	Res,
	UseGuards,
} from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";
import { parseCookie, stringifySetCookie } from "cookie";
import type { Request, Response } from "express";
import { z } from "zod";
import { requestMagicLinkInput } from "./client-portal.contracts";
import { ClientPortalService } from "./client-portal.service";
import {
	ClientSessionGuard,
	type ClientSessionRequest,
} from "./client-session.guard";

const verifyTokenBody = z.object({ token: z.string().min(1) });

type RequestMagicLinkBody = z.input<typeof requestMagicLinkInput>;
type VerifyTokenBody = z.input<typeof verifyTokenBody>;

function clientSessionCookie(value: string, expires: Date): string {
	return stringifySetCookie({
		name: CLIENT_SESSION_COOKIE_NAME,
		value,
		httpOnly: true,
		secure: isProduction,
		sameSite: "lax",
		domain: cookieDomain,
		path: "/",
		expires,
	});
}

@ApiTags("Client Portal")
@Controller("api/client-portal")
export class ClientPortalController {
	constructor(private readonly portal: ClientPortalService) {}

	@Post("request-link")
	@AllowAnonymous()
	@HttpCode(202)
	@ApiOperation({ summary: "Email a client a one-time sign-in link" })
	@ApiOkResponse({
		description:
			"Accepted, regardless of whether the email matches an account.",
	})
	async requestLink(@Body() body: RequestMagicLinkBody) {
		const parsed = requestMagicLinkInput.safeParse(body);
		if (parsed.success) {
			await this.portal.requestMagicLink(parsed.data.email);
		}

		return { ok: true };
	}

	@Post("verify")
	@AllowAnonymous()
	@ApiOperation({ summary: "Exchange a one-time sign-in token for a session" })
	@ApiOkResponse({ description: "The client session cookie was set." })
	async verify(
		@Body() body: VerifyTokenBody,
		@Res({ passthrough: true }) response: Response,
	) {
		const parsed = verifyTokenBody.safeParse(body);
		if (!parsed.success) {
			return { ok: false, reason: "That link is invalid or has expired." };
		}

		const result = await this.portal.verifyToken(parsed.data.token);
		if (!result.ok) return result;

		response.setHeader(
			"Set-Cookie",
			clientSessionCookie(result.sessionToken, result.expiresAt),
		);

		return { ok: true };
	}

	@Post("sign-out")
	@AllowAnonymous()
	@ApiOperation({ summary: "End the current client portal session" })
	@ApiOkResponse({ description: "The client session cookie was cleared." })
	async signOut(
		@Req() request: Request,
		@Res({ passthrough: true }) response: Response,
	) {
		const cookies = parseCookie(request.headers.cookie ?? "");
		const token = cookies[CLIENT_SESSION_COOKIE_NAME];
		if (token) {
			await this.portal.signOut(token);
		}

		response.setHeader("Set-Cookie", clientSessionCookie("", new Date(0)));

		return { ok: true };
	}

	@Get("me")
	@AllowAnonymous()
	@UseGuards(ClientSessionGuard)
	@ApiOperation({ summary: "Confirm the current client portal session" })
	@ApiOkResponse({ description: "The signed-in client contact." })
	me(@Req() request: ClientSessionRequest) {
		return request.clientSession;
	}
}
