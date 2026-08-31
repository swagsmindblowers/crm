"use client";

import Upload from "@carbon/icons-react/es/Upload";
import { Button } from "@crm/ui/components/button";
import { Icon } from "@crm/ui/components/icon";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { toast } from "sonner";
import type { PortalChecklistItem } from "@/lib/portal-matters";
import { uploadPortalDocument } from "@/lib/upload-portal-document";

const UPLOAD_REVIEW_LABEL = {
	PENDING_REVIEW: "Pending review",
	ACCEPTED: "Accepted",
	REJECTED: "Rejected",
} as const;

export function PortalChecklist({
	matterId,
	checklist,
}: {
	matterId: string;
	checklist: PortalChecklistItem[];
}) {
	if (checklist.length === 0) {
		return (
			<p className="text-sm/5 text-muted-foreground">
				There's nothing on your document checklist yet.
			</p>
		);
	}

	return (
		<ul className="flex flex-col gap-4">
			{checklist.map((item) => (
				<li key={item.id} className="flex flex-col gap-2 rounded-lg border p-4">
					<div className="flex items-start justify-between gap-3">
						<div className="flex flex-col gap-0.5">
							<span className="text-sm/5 font-medium">
								{item.label}
								{item.required ? null : (
									<span className="ml-1.5 text-xs text-muted-foreground">
										(optional)
									</span>
								)}
							</span>
							{item.description ? (
								<span className="text-xs/5 text-muted-foreground">
									{item.description}
								</span>
							) : null}
						</div>
						<PortalUploadButton matterId={matterId} checklistItemId={item.id} />
					</div>

					{item.uploads.length > 0 ? (
						<ul className="flex flex-col gap-1">
							{item.uploads.map((upload) => (
								<li
									key={upload.id}
									className="flex items-center justify-between gap-3 text-xs"
								>
									<span className="truncate">{upload.filename}</span>
									<span className="shrink-0 text-muted-foreground">
										{UPLOAD_REVIEW_LABEL[upload.reviewStatus]}
									</span>
								</li>
							))}
						</ul>
					) : null}
				</li>
			))}
		</ul>
	);
}

function PortalUploadButton({
	matterId,
	checklistItemId,
}: {
	matterId: string;
	checklistItemId: string;
}) {
	const router = useRouter();
	const inputRef = useRef<HTMLInputElement>(null);

	return (
		<>
			<input
				ref={inputRef}
				type="file"
				accept=".pdf,.jpg,.jpeg,.png,.docx"
				className="hidden"
				onChange={async (event) => {
					const file = event.target.files?.[0];
					event.target.value = "";
					if (!file) return;

					const result = await uploadPortalDocument(
						matterId,
						checklistItemId,
						file,
					);
					if (result.ok) {
						router.refresh();
					} else {
						toast.error(result.reason);
					}
				}}
			/>
			<Button
				variant="outline"
				size="sm"
				onClick={() => inputRef.current?.click()}
			>
				<Icon icon={Upload} data-icon="inline-start" />
				Upload
			</Button>
		</>
	);
}
