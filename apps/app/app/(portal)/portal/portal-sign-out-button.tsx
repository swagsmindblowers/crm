"use client";

import { Button } from "@crm/ui/components/button";
import { useRouter } from "next/navigation";
import { signOutOfPortal } from "@/lib/client-portal-sign-out";

export function PortalSignOutButton() {
	const router = useRouter();

	return (
		<Button
			variant="ghost"
			size="sm"
			onClick={() => {
				signOutOfPortal()
					.catch(() => {})
					.finally(() => router.push("/portal/sign-in"));
			}}
		>
			Sign out
		</Button>
	);
}
