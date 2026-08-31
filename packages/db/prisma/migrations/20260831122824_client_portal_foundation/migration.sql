-- CreateEnum
CREATE TYPE "DocumentUploadReviewStatus" AS ENUM ('PENDING_REVIEW', 'ACCEPTED', 'REJECTED');

-- AlterTable
ALTER TABLE "contact" ADD COLUMN     "isCompanyAdmin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "checklistDocumentUpload" (
    "id" TEXT NOT NULL,
    "checklistItemId" TEXT NOT NULL,
    "blobUrl" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "uploadedByUserId" TEXT,
    "reviewStatus" "DocumentUploadReviewStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checklistDocumentUpload_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "checklistDocumentUpload_checklistItemId_createdAt_idx" ON "checklistDocumentUpload"("checklistItemId", "createdAt");

-- AddForeignKey
ALTER TABLE "checklistDocumentUpload" ADD CONSTRAINT "checklistDocumentUpload_checklistItemId_fkey" FOREIGN KEY ("checklistItemId") REFERENCES "documentChecklistItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklistDocumentUpload" ADD CONSTRAINT "checklistDocumentUpload_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklistDocumentUpload" ADD CONSTRAINT "checklistDocumentUpload_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
