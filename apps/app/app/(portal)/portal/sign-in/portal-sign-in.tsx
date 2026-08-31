"use client";

import { Button } from "@crm/ui/components/button";
import { Input } from "@crm/ui/components/input";
import { Label } from "@crm/ui/components/label";
import { Spinner } from "@crm/ui/components/spinner";
import { useState } from "react";
import { toast } from "sonner";
import { AuthHeading } from "@/components/auth-shell";

export function PortalSignIn() {
	const [email, setEmail] = useState("");
	const [pending, setPending] = useState(false);
	const [sent, setSent] = useState(false);

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		setPending(true);

		try {
			await fetch("/api/client-portal/request-link", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ email }),
			});
			setSent(true);
		} catch {
			toast.error("Could not reach the sign-in service.");
		} finally {
			setPending(false);
		}
	}

	if (sent) {
		return (
			<AuthHeading
				title="Check your email"
				description={`If ${email} has portal access, we've sent a sign-in link to it. The link works once and expires in 30 minutes.`}
			/>
		);
	}

	return (
		<>
			<AuthHeading
				title="Sign in"
				description="Enter your email and we'll send you a one-time sign-in link."
			/>

			<form
				className="flex flex-col gap-4"
				onSubmit={(event) => {
					handleSubmit(event).catch(() => {
						setPending(false);
					});
				}}
			>
				<div className="flex flex-col gap-2">
					<Label htmlFor="portal-email">Email</Label>
					<Input
						id="portal-email"
						type="email"
						required
						autoComplete="email"
						value={email}
						onChange={(event) => setEmail(event.target.value)}
					/>
				</div>

				<Button className="w-full" disabled={pending} type="submit">
					{pending ? <Spinner data-icon="inline-start" /> : null}
					Send sign-in link
				</Button>
			</form>
		</>
	);
}
