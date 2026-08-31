"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { z } from "zod";
import { AuthHeading } from "@/components/auth-shell";

const verifyResult = z
	.object({ ok: z.literal(true) })
	.or(z.object({ ok: z.literal(false), reason: z.string() }));

export function PortalVerify({ token }: { token: string }) {
	const router = useRouter();
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;

		async function verify() {
			try {
				const response = await fetch("/api/client-portal/verify", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ token }),
				});
				const parsed = verifyResult.safeParse(await response.json());

				if (cancelled) return;

				if (parsed.success && parsed.data.ok) {
					router.replace("/portal");
					return;
				}

				setError(
					parsed.success && !parsed.data.ok
						? parsed.data.reason
						: "That link is invalid or has expired.",
				);
			} catch {
				if (!cancelled) {
					setError("Could not reach the sign-in service.");
				}
			}
		}

		verify();

		return () => {
			cancelled = true;
		};
	}, [token, router]);

	if (!error) {
		return <AuthHeading title="Signing you in" description="One moment…" />;
	}

	return (
		<>
			<AuthHeading title="That link didn't work" description={error} />
			<Link
				href="/portal/sign-in"
				className="text-center text-sm/5 underline underline-offset-4"
			>
				Request a new link
			</Link>
		</>
	);
}
