import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { readClientSession } from "@/lib/client-portal-session";
import { PortalSignIn } from "./portal-sign-in";

export const metadata: Metadata = {
	title: "Client portal sign in",
};

export default async function PortalSignInPage() {
	const session = await readClientSession();
	if (session) redirect("/portal");

	return (
		<AuthShell>
			<PortalSignIn />
		</AuthShell>
	);
}
