import Logo from "@crm/ui/components/logo";
import Link from "next/link";
import { readClientSession } from "@/lib/client-portal-session";
import { PortalSignOutButton } from "./portal-sign-out-button";

export async function PortalHeader() {
	const session = await readClientSession();

	return (
		<header className="flex items-center justify-between gap-2 border-b px-6 py-4 sm:px-10">
			<div className="flex items-center gap-2">
				<Link href="/portal" aria-label="Client portal" className="flex">
					<Logo className="size-6 shrink-0" />
				</Link>
				<span className="text-sm/5 font-medium">Client portal</span>
			</div>

			{session ? <PortalSignOutButton /> : null}
		</header>
	);
}
