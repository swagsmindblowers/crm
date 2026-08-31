import { GOOGLE_PROVIDER_ID, isMailboxProvider } from "@crm/auth";
import type { Db } from "@crm/db";
import { readPortalSenderAccountId } from "@crm/db/settings";
import { Injectable } from "@nestjs/common";
import { InjectDatabase } from "../database/database.constants";
import { GmailClient } from "../google/gmail.client";
import { MailboxTokenService } from "../mailbox/mailbox-token.service";
import { GraphClient } from "../microsoft/graph.client";

export type SendResult = { ok: true } | { ok: false; reason: string };

@Injectable()
export class ClientPortalMailerService {
	constructor(
		@InjectDatabase() private readonly db: Db,
		private readonly tokens: MailboxTokenService,
		private readonly gmail: GmailClient,
		private readonly graph: GraphClient,
	) {}

	async send(message: {
		to: string;
		subject: string;
		text: string;
	}): Promise<SendResult> {
		const accountId = await readPortalSenderAccountId(this.db);
		if (!accountId) {
			return { ok: false, reason: "No portal sender is configured." };
		}

		const account = await this.db.account.findUnique({
			where: { id: accountId },
			select: { userId: true, providerId: true },
		});
		if (!account || !isMailboxProvider(account.providerId)) {
			return {
				ok: false,
				reason: "The configured sender account no longer exists.",
			};
		}

		const token = await this.tokens.accessTokenForUser(
			account.userId,
			account.providerId,
		);
		if (token.outcome !== "ok") {
			return { ok: false, reason: token.reason };
		}

		const result =
			account.providerId === GOOGLE_PROVIDER_ID
				? await this.gmail.sendMail(token.accessToken, message)
				: await this.graph.sendMail(token.accessToken, message);

		if (result.outcome !== "ok") {
			return { ok: false, reason: result.reason };
		}

		return { ok: true };
	}
}
