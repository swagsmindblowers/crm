import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth-shell";
import { readClientSession } from "@/lib/client-portal-session";
import { PortalSignIn } from "./portal-sign-in";

export const metadata: Metadata = {
	title: "Client portal sign in",
};

export default function PortalSignInPage() {
	return (
		<AuthShell>
			<Suspense fallback={<PortalSignIn />}>
				<SignIn />
			</Suspense>
		</AuthShell>
	);
}

async function SignIn() {
	const session = await readClientSession();
	if (session) redirect("/portal");

	return <PortalSignIn />;
}
