import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { db } from "@crm/db";
import type { AgentTriggerService } from "../src/agent/agent-trigger.service";
import { ActivityStampService } from "../src/crm/activity-stamp.service";
import { ConversionService } from "../src/currency/conversion.service";
import { DocumentChecklistService } from "../src/document-checklist/document-checklist.service";
import { FieldsService } from "../src/fields/fields.service";
import { MattersService } from "../src/matters/matters.service";
import { withDiscardedCrmEvents } from "./agent-trigger.stub";

const suffix = process.env.TEST_RUN_ID ?? "matter-checklist-template-spec";
const userId = `user-${suffix}`;
const domain = `checklisttemplate-${suffix}.test`;

const agent = {
	withCrmEvents: withDiscardedCrmEvents,
	conflictCheckRequested: async () => false,
} as unknown as AgentTriggerService;

const matters = new MattersService(
	db,
	agent,
	new ActivityStampService(db),
	new ConversionService(db),
	new FieldsService(db, { fieldBackfill: async () => undefined } as never),
	new DocumentChecklistService(db),
);

let companyId: string;

async function clean() {
	await db.matter.deleteMany({ where: { company: { domain } } });
	await db.company.deleteMany({ where: { domain } });
	await db.user.deleteMany({ where: { id: userId } });
}

async function checklistLabelsFor(matterId: string): Promise<string[]> {
	const items = await db.documentChecklistItem.findMany({
		where: { matterId },
		select: { label: true },
	});
	return items.map((item) => item.label);
}

beforeAll(async () => {
	await clean();

	await db.user.create({
		data: {
			id: userId,
			name: "Checklist Rep",
			email: `${userId}@example.test`,
			emailVerified: true,
		},
	});

	const company = await db.company.create({
		data: { name: `Checklist Co ${suffix}`, domain },
		select: { id: true },
	});
	companyId = company.id;
});

afterAll(clean);

describe("document checklist templates", () => {
	it("seeds nothing for a matter left on the default service", async () => {
		const matter = await matters.create({
			name: `Untyped ${suffix}`,
			companyId,
			ownerId: userId,
		});

		expect(await checklistLabelsFor(matter.id)).toEqual([]);
	});

	it("seeds the standard checklist for a matter created with a real service", async () => {
		const matter = await matters.create({
			name: `Skilled worker ${suffix}`,
			companyId,
			ownerId: userId,
			serviceType: "SKILLED_WORKER_VISA",
		});

		const labels = await checklistLabelsFor(matter.id);
		expect(labels.length).toBeGreaterThan(0);
		expect(labels).toContain("Current passport");
	});

	it("backfills the checklist when the service is corrected after creation", async () => {
		const matter = await matters.create({
			name: `Corrected later ${suffix}`,
			companyId,
			ownerId: userId,
		});
		expect(await checklistLabelsFor(matter.id)).toEqual([]);

		await matters.update(matter.id, { serviceType: "SPONSOR_LICENCE" });

		const labels = await checklistLabelsFor(matter.id);
		expect(labels.length).toBeGreaterThan(0);
	});

	it("never touches a checklist a rep has already built by hand", async () => {
		const matter = await matters.create({
			name: `Hand built ${suffix}`,
			companyId,
			ownerId: userId,
		});

		await db.documentChecklistItem.create({
			data: {
				matterId: matter.id,
				label: "Custom document",
				required: true,
				position: 0,
			},
		});

		await matters.update(matter.id, { serviceType: "SKILLED_WORKER_VISA" });

		expect(await checklistLabelsFor(matter.id)).toEqual(["Custom document"]);
	});

	it("does nothing when switched to a service with no template", async () => {
		const matter = await matters.create({
			name: `Back to other ${suffix}`,
			companyId,
			ownerId: userId,
			serviceType: "SKILLED_WORKER_VISA",
		});
		const originalLabels = await checklistLabelsFor(matter.id);

		await matters.update(matter.id, { serviceType: "OTHER" });

		expect(await checklistLabelsFor(matter.id)).toEqual(originalLabels);
	});
});
