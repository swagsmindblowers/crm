import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { readClientSession } from "@/lib/client-portal-session";
import { getPortalMatter } from "@/lib/portal-matters";
import { PortalHeader } from "../../portal-header";
import { PortalStatusBadge } from "../../portal-status-badge";
import { PortalChecklist } from "./portal-checklist";

export const metadata: Metadata = {
	title: "Matter details",
};

export default function PortalMatterPage({
	params,
}: PageProps<"/portal/matters/[matterId]">) {
	return (
		<Suspense fallback={null}>
			<MatterDetail params={params} />
		</Suspense>
	);
}

async function MatterDetail({
	params,
}: Pick<PageProps<"/portal/matters/[matterId]">, "params">) {
	const session = await readClientSession();
	if (!session) redirect("/portal/sign-in");

	const { matterId } = await params;
	const matter = await getPortalMatter(matterId);
	if (!matter) notFound();

	return (
		<>
			<PortalHeader />

			<main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10 sm:px-10">
				<div className="flex flex-col gap-2">
					<h1 className="text-xl/7 font-semibold">{matter.name}</h1>
					<div className="flex items-center gap-2">
						<span className="text-sm/5 text-muted-foreground">
							{matter.companyName}
						</span>
						<PortalStatusBadge
							status={matter.status}
							label={matter.statusLabel}
						/>
					</div>
				</div>

				<div className="flex flex-col gap-3">
					<h2 className="text-sm/5 font-medium">Documents</h2>
					<PortalChecklist matterId={matter.id} checklist={matter.checklist} />
				</div>
			</main>
		</>
	);
}
