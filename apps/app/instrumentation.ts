export async function register() {
	if (process.env.NEXT_RUNTIME !== "nodejs") return;

	const { initErrorMonitoring } = await import("@/lib/error-monitoring");
	initErrorMonitoring();
}

export async function onRequestError(error: unknown) {
	const { reportError } = await import("@/lib/error-monitoring");
	reportError(error);
}
