import * as Sentry from "@sentry/node";

export function initErrorMonitoring(): void {
	const dsn = process.env.SENTRY_DSN;
	if (!dsn) return;

	Sentry.init({
		dsn,
		environment: process.env.NODE_ENV ?? "development",
		tracesSampleRate: 0,
	});
}

export function reportError(error: unknown): void {
	if (!process.env.SENTRY_DSN) return;
	Sentry.captureException(error);
}
