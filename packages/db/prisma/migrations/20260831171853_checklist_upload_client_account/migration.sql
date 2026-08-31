-- AlterTable
ALTER TABLE "checklistDocumentUpload" ADD COLUMN     "uploadedByClientAccountId" TEXT;

-- AddForeignKey
ALTER TABLE "checklistDocumentUpload" ADD CONSTRAINT "checklistDocumentUpload_uploadedByClientAccountId_fkey" FOREIGN KEY ("uploadedByClientAccountId") REFERENCES "clientAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
