"use client";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@crm/ui/components/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@crm/ui/components/select";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCrmCache } from "@/lib/trpc/cache";
import { useTRPC } from "@/lib/trpc/client";

const NONE = "__none";

export function PortalSenderSection() {
	const trpc = useTRPC();
	const cache = useCrmCache();

	const query = useQuery(trpc.settings.portalSender.queryOptions());

	const save = useMutation(
		trpc.settings.setPortalSender.mutationOptions({
			onSuccess: async () => {
				await cache.settings();
				toast.success("Portal sender saved.");
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	if (!query.data) return null;

	const { selected, candidates } = query.data;
	const sendable = candidates.filter((candidate) => candidate.canSend);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Client portal sender</CardTitle>
				<CardDescription>
					The mailbox that sends sign-in links to clients. Only a connected
					account that has granted send permission can be picked — reconnect
					Google or Microsoft above to grant it.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Select
					value={selected?.accountId ?? NONE}
					disabled={save.isPending}
					onValueChange={(value) =>
						save.mutate({ accountId: value === NONE ? null : value })
					}
				>
					<SelectTrigger className="w-full max-w-sm">
						<SelectValue placeholder="No sender chosen" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={NONE}>
							None — staff copies the link manually
						</SelectItem>
						{sendable.map((candidate) => (
							<SelectItem key={candidate.accountId} value={candidate.accountId}>
								{candidate.email}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				{sendable.length === 0 ? (
					<p className="mt-2 text-muted-foreground text-xs">
						No connected account has granted send permission yet.
					</p>
				) : null}
			</CardContent>
		</Card>
	);
}
