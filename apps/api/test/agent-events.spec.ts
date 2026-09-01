import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { db } from "@crm/db";
import { AgentTriggerService } from "../src/agent/agent-trigger.service";
import { ActivityStampService } from "../src/crm/activity-stamp.service";
import { ConversionService } from "../src/currency/conversion.service";
import { DocumentChecklistService } from "../src/document-checklist/document-checklist.service";
import { FieldsService } from "../src/fields/fields.service";
import { MattersService } from "../src/matters/matters.service";

const suffix = crypto.randomUUID();
const matterId = `event-matter-${suffix}`;
const contactId = `event-contact-${suffix}`;
const companyId = `event-company-${suffix}`;
const service = new AgentTriggerService(db);
const stamp = new ActivityStampService(db);
const conversion = new ConversionService(db);
const fields = new FieldsService(db, service);
const matters = new MattersService(
	db,
	service,
	stamp,
	conversion,
	fields,
	new DocumentChecklistService(db),
);
const channelId = `event-channel-${suffix}`;
const ownerId = `event-owner-${suffix}`;
const domain = `event-${suffix}.example.test`;
let persistedCompanyId = "";
let persistedMatterId = "";
let previousBridgeSecret: string | undefined;

beforeAll(async () => {
	previousBridgeSecret = process.env.AGENT_BRIDGE_SECRET;
	delete process.env.AGENT_BRIDGE_SECRET;
	await db.agentTask.deleteMany({
		where: { OR: [{ matterId }, { contactId }] },
	});
	await db.user.create({
		data: {
			id: ownerId,
			name: "Event Test Owner",
			email: `${ownerId}@example.test`,
		},
	});
	const company = await db.company.create({
		data: { name: "Event Test Company", domain },
		select: { id: true },
	});
	persistedCompanyId = company.id;
});

afterAll(async () => {
	await db.agentTask.deleteMany({
		where: {
			OR: [
				{ matterId: { in: [matterId, persistedMatterId].filter(Boolean) } },
				{ contactId },
			],
		},
	});
	await db.agentTask.deleteMany({
		where: {
			kind: "slack-channel-join",
			payload: { path: ["channelId"], equals: channelId },
		},
	});
	if (persistedMatterId) {
		await db.activity.deleteMany({ where: { matterId: persistedMatterId } });
		await db.matter.deleteMany({ where: { id: persistedMatterId } });
	}
	if (persistedCompanyId) {
		await db.company.deleteMany({ where: { id: persistedCompanyId } });
	}
	await db.user.deleteMany({ where: { id: ownerId } });
	if (previousBridgeSecret === undefined) {
		delete process.env.AGENT_BRIDGE_SECRET;
	} else {
		process.env.AGENT_BRIDGE_SECRET = previousBridgeSecret;
	}
});

describe("CRM agent events", () => {
	it("routes every event to its catalog record kind", async () => {
		const occurredAt = new Date("2026-08-10T09:00:00.000Z");
		await service.withCrmEvents(async (_tx, emit) => {
			await emit({
				type: "contact.created",
				record: { kind: "contact", id: contactId },
				occurredAt,
				data: { email: "person@example.test" },
			});
		});

		expect(
			await db.agentTask.findFirstOrThrow({
				where: { contactId, kind: "agent-event" },
				select: {
					contactId: true,
					companyId: true,
					matterId: true,
					payload: true,
				},
			}),
		).toEqual({
			contactId,
			companyId: null,
			matterId: null,
			payload: {
				type: "contact.created",
				record: { kind: "contact", id: contactId },
				occurredAt: occurredAt.toISOString(),
				data: { email: "person@example.test" },
			},
		});
	});

	it("writes durable created and closed events for the agent worker", async () => {
		const createdAt = new Date("2026-08-10T10:00:00.000Z");
		const closedAt = new Date("2026-08-10T11:00:00.000Z");

		await service.withCrmEvents(async (_tx, emit) => {
			await emit({
				type: "matter.created",
				record: { kind: "matter", id: matterId },
				occurredAt: createdAt,
				data: { companyId, stage: "ENQUIRY" },
			});
			await emit({
				type: "matter.closed",
				record: { kind: "matter", id: matterId },
				occurredAt: closedAt,
				data: { companyId, from: "NEGOTIATION", to: "GRANTED" },
			});
		});

		const tasks = await db.agentTask.findMany({
			where: { matterId, kind: "agent-event" },
			select: {
				matterId: true,
				reason: true,
				payload: true,
				finishedAt: true,
			},
		});

		expect(tasks).toHaveLength(2);
		expect(tasks.find((task) => task.reason === "matter.created")).toEqual({
			matterId,
			reason: "matter.created",
			payload: {
				type: "matter.created",
				record: { kind: "matter", id: matterId },
				occurredAt: createdAt.toISOString(),
				data: { companyId, stage: "ENQUIRY" },
			},
			finishedAt: null,
		});
		expect(tasks.find((task) => task.reason === "matter.closed")).toEqual({
			matterId,
			reason: "matter.closed",
			payload: {
				type: "matter.closed",
				record: { kind: "matter", id: matterId },
				occurredAt: closedAt.toISOString(),
				data: { companyId, from: "NEGOTIATION", to: "GRANTED" },
			},
			finishedAt: null,
		});
	});

	it("queues one Slack join for a channel that is renamed", async () => {
		await service.slackChannelJoinRequested(channelId, "matter-room");
		await service.slackChannelJoinRequested(channelId, "matter-room-renamed");

		expect(
			await db.agentTask.findMany({
				where: {
					kind: "slack-channel-join",
					payload: { path: ["channelId"], equals: channelId },
				},
				select: { reason: true },
			}),
		).toEqual([{ reason: "Add MyLegalXpert to #matter-room" }]);
	});

	it("rolls back the record when its event cannot commit", async () => {
		const rollbackCompanyId = `event-rollback-company-${suffix}`;
		let error: Error | null = null;

		try {
			await service.withCrmEvents(async (tx, emit) => {
				const company = await tx.company.create({
					data: {
						id: rollbackCompanyId,
						name: "Rollback Event Company",
					},
					select: { id: true, createdAt: true },
				});
				await emit({
					type: "company.created",
					record: { kind: "company", id: company.id },
					occurredAt: company.createdAt,
					data: { name: "Rollback Event Company", domain: null },
				});
				throw new Error("Rollback the record and outbox together.");
			});
		} catch (caught) {
			error = caught as Error;
		}

		expect(error?.message).toBe("Rollback the record and outbox together.");
		expect(
			await db.company.findUnique({ where: { id: rollbackCompanyId } }),
		).toBeNull();
		expect(
			await db.agentTask.count({
				where: { companyId: rollbackCompanyId, kind: "agent-event" },
			}),
		).toBe(0);
	});

	it("emits each real matter lifecycle transition exactly once", async () => {
		const matter = await matters.create({
			name: "Event-driven matter",
			companyId: persistedCompanyId,
			ownerId,
			amountCents: 25_000,
			currency: "USD",
		});
		persistedMatterId = matter.id;

		const transitions = await Promise.all([
			matters.setStage({ id: matter.id, stage: "GRANTED" }, ownerId),
			matters.setStage({ id: matter.id, stage: "GRANTED" }, ownerId),
		]);

		expect(transitions.map((transition) => transition.changed).sort()).toEqual([
			false,
			true,
		]);
		await matters.setStage({ id: matter.id, stage: "INSTRUCTED" }, ownerId);

		const reasons = (
			await db.agentTask.findMany({
				where: { matterId: matter.id, kind: "agent-event" },
				select: { reason: true },
			})
		)
			.map((task) => task.reason)
			.sort();
		expect(reasons).toEqual([
			"matter.closed",
			"matter.created",
			"matter.opened",
			"matter.stage.changed",
			"matter.stage.changed",
		]);
		expect(
			await db.activity.count({
				where: { matterId: matter.id, type: "STAGE_CHANGE" },
			}),
		).toBe(2);
	});
});
