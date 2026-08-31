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
					<h2 className="font-medium text-lg">Scope</h2>
					<p className="text-[15px] text-muted-foreground leading-6">
						This policy covers the clients and other contacts whose data your
						firm keeps in this CRM. It does not cover your firm's own staff — an
						internal or employee privacy notice covers what this CRM knows about
						the people who work at your firm.
					</p>
				</section>

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
					<h2 className="font-medium text-lg">Why we process this data</h2>
					<p className="text-[15px] text-muted-foreground leading-6">
						Placeholder — name the legal basis that applies: performing the
						engagement your firm was retained for (contract), a legitimate
						interest in managing the matter and the client relationship, or
						consent, where your firm relies on it. State which basis applies to
						which category of data before publishing this policy.
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
					<h2 className="font-medium text-lg">International transfers</h2>
					<p className="text-[15px] text-muted-foreground leading-6">
						Placeholder — name the region this CRM and its connected
						integrations process data in, and, if that differs from where your
						clients are located, the safeguard your firm relies on for the
						transfer (for example standard contractual clauses).
					</p>
				</section>

				<section className="flex flex-col gap-2">
					<h2 className="font-medium text-lg">Cookies</h2>
					<p className="text-[15px] text-muted-foreground leading-6">
						If your firm installs the tracking snippet on its own website, it
						sets a first-party cookie to recognize a returning visitor and
						attribute their enquiry to how they found your site. It does not
						read cookies set by other sites, and it is off unless your firm adds
						it in Settings → Tracking.
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
					<h2 className="font-medium text-lg">Your rights</h2>
					<p className="text-[15px] text-muted-foreground leading-6">
						Placeholder — describe how a client or contact can ask to see,
						correct, or have their data deleted: contact your instructing
						solicitor, who can act on the request from inside the CRM. Name any
						response timeframe your firm commits to.
					</p>
				</section>

				<section className="flex flex-col gap-2">
					<h2 className="font-medium text-lg">Security</h2>
					<p className="text-[15px] text-muted-foreground leading-6">
						Data is encrypted in transit, access is restricted to signed-in
						members of your firm's workspace, and security-relevant events
						(failed sign-ins, denied access) are logged. No security measure is
						perfect — describe your firm's own incident response process here.
					</p>
				</section>

				<section className="flex flex-col gap-2">
					<h2 className="font-medium text-lg">Changes to this policy</h2>
					<p className="text-[15px] text-muted-foreground leading-6">
						Your firm may update this policy as its practices change. Material
						changes will be reflected in the "Last updated" date above —
						describe here how your firm will notify clients of a material
						change, if it commits to doing so.
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
