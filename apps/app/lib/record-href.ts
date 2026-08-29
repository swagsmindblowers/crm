import { workspaceUrl } from "@/lib/workspace-url";

export function recordHref(
	slug: string,
	list: "/companies" | "/contacts" | "/matters",
	kind: "company" | "contact" | "matter",
	id: string,
): string {
	const query = new URLSearchParams({ record: `${kind}:${id}` });

	return `${workspaceUrl(slug, list)}?${query}`;
}
