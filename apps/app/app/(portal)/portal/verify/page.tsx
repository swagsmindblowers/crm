import type { Metadata } from "next";
import { AuthHeading, AuthShell } from "@/components/auth-shell";
import { PortalVerify } from "./portal-verify";

export const metadata: Metadata = {
	title: "Verifying your link",
};

export default async function PortalVerifyPage({
	searchParams,
}: PageProps<"/portal/verify">) {
	const { token } = await searchParams;
	const raw = Array.isArray(token) ? token[0] : token;

	return (
		<AuthShell>
			{raw ? (
				<PortalVerify token={raw} />
			) : (
				<AuthHeading
					title="That link didn't work"
					description="This sign-in link is missing its token."
				/>
			)}
		</AuthShell>
	);
}
