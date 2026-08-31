import type { NextFunction, Request, Response } from "express";

export function maintenanceMode(
	req: Request,
	res: Response,
	next: NextFunction,
): void {
	if (!process.env.MAINTENANCE_MODE || req.path === "/health") {
		next();
		return;
	}

	res.status(503).json({
		statusCode: 503,
		message: "This CRM is temporarily unavailable for maintenance.",
	});
}
