import { createListSearchParams } from "@/components/data-table/list-search-params";

export const mattersSearchParams = createListSearchParams({
	defaultSort: "createdAt",
	defaultDir: "desc",
	tabId: "status",
	facetIds: ["owner", "stage", "closing"] as const,
});
