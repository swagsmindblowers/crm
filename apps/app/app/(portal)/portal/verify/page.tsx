import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthHeading, AuthShell } from "@/components/auth-shell";
import { PortalVerify } from "./portal-verify";

export const metadata: Metadata = {
	title: "Verifying your link",
};

export default function PortalVerifyPage({
	searchParams,
}: PageProps<"/portal/verify">) {
	return (
		<AuthShell>
			<Suspense
				fallback={
					<AuthHeading title="Signing you in" description="One moment…" />
				}
			>
				<Verify searchParams={searchParams} />
			</Suspense>
		</AuthShell>
	);
}

async function Verify({
	searchParams,
}: Pick<PageProps<"/portal/verify">, "searchParams">) {
	const { token } = await searchParams;
	const raw = Array.isArray(token) ? token[0] : token;

	if (!raw) {
		return (
			<AuthHeading
				title="That link didn't work"
				description="This sign-in link is missing its token."
			/>
		);
	}

	return <PortalVerify token={raw} />;
}
