"use client";

export async function signOutOfPortal(): Promise<void> {
	await fetch("/api/client-portal/sign-out", { method: "POST" });
}
