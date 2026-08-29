import { redirect } from "next/navigation";
import { recordHref } from "@/lib/record-href";

export const instant = false;

export default async function RecordRedirect({
	params,
}: {
	params: Promise<{ slug: string; matterId: string }>;
}) {
	const { slug, matterId } = await params;
	redirect(recordHref(slug, "/matters", "matter", matterId));
}
