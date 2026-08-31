import { appUrl } from "@crm/auth";
import type { Db } from "@crm/db";
import {
	BadRequestException,
	Injectable,
	Logger,
	NotFoundException,
} from "@nestjs/common";
import { normalizeEmail } from "../crm/values";
import { InjectDatabase } from "../database/database.constants";
import type {
	ClientAccountResult,
	IssueLoginLinkResult,
} from "./client-portal.contracts";
import { CLIENT_PORTAL } from "./client-portal-config";
import { ClientPortalMailerService } from "./client-portal-mailer.service";
import { hashToken, issueToken } from "./client-portal-token";

export type ClientSession = {
	clientAccountId: string;
	contactId: string;
	email: string;
};

function portalVerifyUrl(token: string): string {
	return new URL(`/portal/verify?token=${token}`, appUrl).toString();
}

@Injectable()
export class ClientPortalService {
	private readonly logger = new Logger(ClientPortalService.name);

	constructor(
		@InjectDatabase() private readonly db: Db,
		private readonly mailer: ClientPortalMailerService,
	) {}

	async issueLoginLink(contactId: string): Promise<IssueLoginLinkResult> {
		const contact = await this.db.contact.findUnique({
			where: { id: contactId },
			select: { email: true },
		});
		if (!contact) {
			throw new NotFoundException(`No contact with id ${contactId}.`);
		}

		const email = normalizeEmail(contact.email ?? "");
		if (!email) {
			throw new BadRequestException("This contact has no email address.");
		}

		const account: ClientAccountResult = await this.db.clientAccount.upsert({
			where: { contactId },
			create: { contactId, email },
			update: { email },
			select: { id: true, contactId: true, email: true },
		});

		const { token, tokenHash } = issueToken();
		await this.db.clientLoginToken.create({
			data: {
				clientAccountId: account.id,
				tokenHash,
				expiresAt: new Date(Date.now() + CLIENT_PORTAL.loginToken.ttlMs),
			},
		});

		const link = portalVerifyUrl(token);
		const result = await this.mailer.send({
			to: email,
			subject: "Your sign-in link",
			text: signInEmailBody(link),
		});

		this.logger.log({
			message: "Client portal login link issued",
			contactId,
			sent: result.ok,
		});

		return { sent: result.ok, link: result.ok ? null : link };
	}

	async requestMagicLink(email: string): Promise<void> {
		const normalized = normalizeEmail(email);
		if (!normalized) return;

		const account = await this.db.clientAccount.findUnique({
			where: { email: normalized },
			select: { id: true },
		});
		if (!account) return;

		const { token, tokenHash } = issueToken();
		await this.db.clientLoginToken.create({
			data: {
				clientAccountId: account.id,
				tokenHash,
				expiresAt: new Date(Date.now() + CLIENT_PORTAL.loginToken.ttlMs),
			},
		});

		const result = await this.mailer.send({
			to: normalized,
			subject: "Your sign-in link",
			text: signInEmailBody(portalVerifyUrl(token)),
		});

		if (!result.ok) {
			this.logger.warn({
				message: "Could not email a client portal magic link",
				reason: result.reason,
			});
		}
	}

	async verifyToken(
		token: string,
	): Promise<
		| { ok: true; sessionToken: string; expiresAt: Date }
		| { ok: false; reason: string }
	> {
		const tokenHash = hashToken(token);
		const row = await this.db.clientLoginToken.findUnique({
			where: { tokenHash },
			select: {
				id: true,
				clientAccountId: true,
				expiresAt: true,
				consumedAt: true,
			},
		});

		if (!row || row.consumedAt || row.expiresAt < new Date()) {
			return { ok: false, reason: "That link is invalid or has expired." };
		}

		await this.db.clientLoginToken.update({
			where: { id: row.id },
			data: { consumedAt: new Date() },
		});

		const session = issueToken();
		const expiresAt = new Date(Date.now() + CLIENT_PORTAL.session.ttlMs);

		await this.db.clientSession.create({
			data: {
				clientAccountId: row.clientAccountId,
				tokenHash: session.tokenHash,
				expiresAt,
			},
		});

		return { ok: true, sessionToken: session.token, expiresAt };
	}

	async sessionFromToken(rawToken: string): Promise<ClientSession | null> {
		const tokenHash = hashToken(rawToken);
		const row = await this.db.clientSession.findUnique({
			where: { tokenHash },
			select: {
				expiresAt: true,
				clientAccount: { select: { id: true, contactId: true, email: true } },
			},
		});

		if (!row || row.expiresAt < new Date()) return null;

		return {
			clientAccountId: row.clientAccount.id,
			contactId: row.clientAccount.contactId,
			email: row.clientAccount.email,
		};
	}
}

function signInEmailBody(link: string): string {
	return [
		`Sign in here: ${link}`,
		"",
		"This link expires in 30 minutes and can only be used once.",
	].join("\n");
}
