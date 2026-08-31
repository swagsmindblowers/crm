import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@crm/ui/components/card";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { readClientSession } from "@/lib/client-portal-session";
import { listPortalMatters } from "@/lib/portal-matters";
import { PortalHeader } from "./portal-header";
import { PortalStatusBadge } from "./portal-status-badge";

export const metadata: Metadata = {
	title: "Your matters",
};

export default function PortalDashboardPage() {
	return (
		<Suspense fallback={null}>
			<Dashboard />
		</Suspense>
	);
}

async function Dashboard() {
	const session = await readClientSession();
	if (!session) redirect("/portal/sign-in");

	const matters = await listPortalMatters();
	const showCompany =
		new Set(matters.map((matter) => matter.companyName)).size > 1;

	return (
		<>
			<PortalHeader />

			<main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10 sm:px-10">
				<h1 className="text-xl/7 font-semibold">Your matters</h1>

				{matters.length === 0 ? (
					<p className="text-sm/5 text-muted-foreground">
						There's nothing here yet. Your legal team will let you know once a
						matter is ready for you to see.
					</p>
				) : (
					<div className="flex flex-col gap-3">
						{matters.map((matter) => (
							<Link key={matter.id} href={`/portal/matters/${matter.id}`}>
								<Card className="rounded-lg border p-4 transition-colors hover:bg-muted/50">
									<CardHeader className="p-0">
										<CardTitle>{matter.name}</CardTitle>
										{showCompany ? (
											<CardDescription>{matter.companyName}</CardDescription>
										) : null}
									</CardHeader>
									<PortalStatusBadge
										status={matter.status}
										label={matter.statusLabel}
									/>
								</Card>
							</Link>
						))}
					</div>
				)}
			</main>
		</>
	);
}
