import { CLIENT_SESSION_COOKIE_NAME } from "@crm/auth";
import {
	type CanActivate,
	type ExecutionContext,
	Injectable,
	UnauthorizedException,
} from "@nestjs/common";
import { parseCookie } from "cookie";
import type { Request } from "express";
import {
	ClientPortalService,
	type ClientSession,
} from "./client-portal.service";

export type ClientSessionRequest = Request & { clientSession: ClientSession };

@Injectable()
export class ClientSessionGuard implements CanActivate {
	constructor(private readonly portal: ClientPortalService) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest<ClientSessionRequest>();
		const cookies = parseCookie(request.headers.cookie ?? "");
		const token = cookies[CLIENT_SESSION_COOKIE_NAME];

		if (!token) {
			throw new UnauthorizedException("Sign in to the client portal first.");
		}

		const session = await this.portal.sessionFromToken(token);
		if (!session) {
			throw new UnauthorizedException("That session has expired.");
		}

		request.clientSession = session;
		return true;
	}
}
