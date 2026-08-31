import { Alert, AlertDescription, AlertTitle } from "@crm/ui/components/alert";
import type { Metadata } from "next";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingNav } from "@/components/landing/landing-nav";

export const metadata: Metadata = {
	title: "Privacy policy",
	description: "How MyLegalXpert handles client and workspace data.",
};

export default function PrivacyPolicy() {
	return (
		<div className="dark flex min-h-svh w-full flex-col items-center overflow-clip bg-background font-sans text-foreground">
			<LandingNav />

			<main className="flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-16">
				<Alert variant="warning">
					<AlertTitle>Template — not yet reviewed by counsel</AlertTitle>
					<AlertDescription>
						This page is a placeholder. Replace this notice and the text below
						with policy language your firm's counsel has approved before relying
						on it for a real client-facing deployment.
					</AlertDescription>
				</Alert>

				<h1 className="font-medium text-3xl">Privacy policy</h1>
				<p className="text-muted-foreground text-sm">Last updated: —</p>

				<section className="flex flex-col gap-2">
					<h2 className="font-medium text-lg">What this CRM stores</h2>
					<p className="text-[15px] text-muted-foreground leading-6">
						This CRM stores the records your firm creates in it — contacts,
						companies, matters, the documents and notes attached to them, and
						the correspondence your firm connects (email, calendar, Slack) so it
						can be found alongside those records.
					</p>
				</section>

				<section className="flex flex-col gap-2">
					<h2 className="font-medium text-lg">Who can see it</h2>
					<p className="text-[15px] text-muted-foreground leading-6">
						Only members of your firm's workspace, signed in with an account on
						your firm's own email domain. This CRM is private by default —
						nobody outside your workspace can sign in or see your data.
					</p>
				</section>

				<section className="flex flex-col gap-2">
					<h2 className="font-medium text-lg">
						Third parties this CRM can send data to
					</h2>
					<p className="text-[15px] text-muted-foreground leading-6">
						Only the integrations your firm chooses to connect in Settings →
						Connections — for example Google, Microsoft, or Slack, to read the
						correspondence you authorize. An optional web-research provider may
						be used to look up public information about a contact or company,
						never client-confidential details. No client data is sold, and no
						client data is used to train a shared or third-party model.
					</p>
				</section>

				<section className="flex flex-col gap-2">
					<h2 className="font-medium text-lg">How long data is kept</h2>
					<p className="text-[15px] text-muted-foreground leading-6">
						Records are kept until your firm deletes them or archives the
						matter. Your firm's administrator controls retention settings for
						connected mailboxes and tracked website activity in Settings.
					</p>
				</section>

				<section className="flex flex-col gap-2">
					<h2 className="font-medium text-lg">Questions</h2>
					<p className="text-[15px] text-muted-foreground leading-6">
						Contact your firm's workspace administrator with any question about
						how this CRM handles your data.
					</p>
				</section>
			</main>

			<LandingFooter />
		</div>
	);
}
