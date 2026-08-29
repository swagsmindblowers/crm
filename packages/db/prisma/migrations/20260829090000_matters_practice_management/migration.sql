-- Deal becomes Matter: rename in place, keep data.

CREATE TYPE "MatterStage" AS ENUM ('ENQUIRY', 'INSTRUCTED', 'PREPARING_APPLICATION', 'SUBMITTED', 'AWAITING_DECISION', 'GRANTED', 'REFUSED', 'WITHDRAWN');

CREATE TYPE "ServiceType" AS ENUM ('DIAGNOSTIC_CONSULTATION', 'DOCUMENT_CHECKING', 'CERTIFICATE_OF_ENTITLEMENT', 'SUBJECT_ACCESS_REQUEST', 'EUSS_APPLICATION', 'SPOUSE_PARTNER_VISA', 'FIANCE_CIVIL_PARTNER', 'PARENT_OF_BRITISH_CHILD', 'ILR_SPOUSE_PARTNER', 'ILR_LONG_RESIDENCE', 'ADULT_DEPENDENT_RELATIVE', 'SPONSOR_LICENCE', 'SKILLED_WORKER_VISA', 'SENIOR_SPECIALIST_WORKER', 'INNOVATOR_FOUNDER_GLOBAL_TALENT', 'ILR_WORK_ROUTE', 'NATURALISATION_ADULT', 'REGISTRATION_BRITISH_CITIZEN_CHILD', 'STUDENT_VISA', 'VISITOR_VISA', 'OTHER');

CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'WAIVED');

CREATE TYPE "DocumentChecklistStatus" AS ENUM ('OUTSTANDING', 'RECEIVED', 'NOT_APPLICABLE');

CREATE TYPE "ConflictCheckStatus" AS ENUM ('CLEAR', 'POTENTIAL_CONFLICT', 'DISMISSED');

ALTER TABLE "deal" ALTER COLUMN "stage" DROP DEFAULT;
ALTER TABLE "deal" ALTER COLUMN "stage" TYPE "MatterStage" USING (
  CASE "stage"::text
    WHEN 'DEMO_BOOKED' THEN 'ENQUIRY'
    WHEN 'QUALIFIED_TO_BUY' THEN 'INSTRUCTED'
    WHEN 'DECISION_MAKER_BOUGHT_IN' THEN 'PREPARING_APPLICATION'
    WHEN 'CONTRACT_SENT' THEN 'SUBMITTED'
    WHEN 'CLOSED_WON' THEN 'GRANTED'
    WHEN 'CLOSED_LOST' THEN 'REFUSED'
    WHEN 'UNQUALIFIED_TO_BUY' THEN 'WITHDRAWN'
  END
)::"MatterStage";
ALTER TABLE "deal" ALTER COLUMN "stage" SET DEFAULT 'ENQUIRY';
DROP TYPE "DealStage";

ALTER TYPE "FieldEntity" RENAME VALUE 'DEAL' TO 'MATTER';

ALTER TABLE "deal" RENAME TO "matter";
ALTER TABLE "matter" RENAME CONSTRAINT "deal_pkey" TO "matter_pkey";
ALTER TABLE "matter" RENAME CONSTRAINT "deal_companyId_fkey" TO "matter_companyId_fkey";
ALTER TABLE "matter" RENAME CONSTRAINT "deal_ownerId_fkey" TO "matter_ownerId_fkey";
ALTER INDEX "deal_companyId_idx" RENAME TO "matter_companyId_idx";
ALTER INDEX "deal_ownerId_idx" RENAME TO "matter_ownerId_idx";
ALTER INDEX "deal_stage_idx" RENAME TO "matter_stage_idx";
ALTER INDEX "deal_expectedCloseDate_idx" RENAME TO "matter_expectedCloseDate_idx";
ALTER INDEX "deal_lastActivityAt_idx" RENAME TO "matter_lastActivityAt_idx";
ALTER INDEX "deal_baseAmount_idx" RENAME TO "matter_baseAmount_idx";
ALTER INDEX "deal_currency_idx" RENAME TO "matter_currency_idx";
ALTER INDEX "deal_archivedAt_idx" RENAME TO "matter_archivedAt_idx";

ALTER TABLE "dealContact" RENAME TO "matterContact";
ALTER TABLE "matterContact" RENAME COLUMN "dealId" TO "matterId";
ALTER TABLE "matterContact" RENAME CONSTRAINT "dealContact_pkey" TO "matterContact_pkey";
ALTER TABLE "matterContact" RENAME CONSTRAINT "dealContact_dealId_fkey" TO "matterContact_matterId_fkey";
ALTER TABLE "matterContact" RENAME CONSTRAINT "dealContact_contactId_fkey" TO "matterContact_contactId_fkey";
ALTER INDEX "dealContact_contactId_idx" RENAME TO "matterContact_contactId_idx";

ALTER TABLE "activity" RENAME COLUMN "dealId" TO "matterId";
ALTER TABLE "activity" RENAME CONSTRAINT "activity_dealId_fkey" TO "activity_matterId_fkey";
ALTER INDEX "activity_dealId_createdAt_idx" RENAME TO "activity_matterId_createdAt_idx";

ALTER TABLE "agentConversation" RENAME COLUMN "dealId" TO "matterId";
ALTER TABLE "agentConversation" RENAME CONSTRAINT "agentConversation_dealId_fkey" TO "agentConversation_matterId_fkey";
ALTER INDEX "agentConversation_dealId_lastMessageAt_idx" RENAME TO "agentConversation_matterId_lastMessageAt_idx";

ALTER TABLE "agentTask" RENAME COLUMN "dealId" TO "matterId";
ALTER INDEX "agentTask_dealId_idx" RENAME TO "agentTask_matterId_idx";

ALTER TABLE "fieldValue" RENAME COLUMN "dealId" TO "matterId";
ALTER TABLE "fieldValue" RENAME CONSTRAINT "fieldValue_dealId_fkey" TO "fieldValue_matterId_fkey";
ALTER INDEX "fieldValue_fieldId_dealId_key" RENAME TO "fieldValue_fieldId_matterId_key";
ALTER INDEX "fieldValue_dealId_idx" RENAME TO "fieldValue_matterId_idx";

ALTER TABLE "matter" ALTER COLUMN "currency" SET DEFAULT 'GBP';
ALTER TABLE "matter" ADD COLUMN "serviceType" "ServiceType" NOT NULL DEFAULT 'OTHER';
ALTER TABLE "matter" ADD COLUMN "serviceTypeRaw" TEXT;
ALTER TABLE "matter" ADD COLUMN "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID';
ALTER TABLE "matter" ADD COLUMN "vatExcluded" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "matter" ADD COLUMN "disbursementsNotes" TEXT;
ALTER TABLE "matter" ADD COLUMN "applicationSubmittedAt" TIMESTAMP(3);
ALTER TABLE "matter" ADD COLUMN "biometricsAt" TIMESTAMP(3);
ALTER TABLE "matter" ADD COLUMN "decisionDueAt" TIMESTAMP(3);
ALTER TABLE "matter" ADD COLUMN "decisionReceivedAt" TIMESTAMP(3);
ALTER TABLE "matter" ADD COLUMN "visaExpiresAt" TIMESTAMP(3);
ALTER TABLE "matter" ADD COLUMN "conditionsExpireAt" TIMESTAMP(3);

CREATE INDEX "matter_serviceType_idx" ON "matter"("serviceType");
CREATE INDEX "matter_decisionDueAt_idx" ON "matter"("decisionDueAt");
CREATE INDEX "matter_visaExpiresAt_idx" ON "matter"("visaExpiresAt");

CREATE TABLE "matterKeyDate" (
    "id" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matterKeyDate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "matterKeyDate_matterId_date_idx" ON "matterKeyDate"("matterId", "date");

ALTER TABLE "matterKeyDate" ADD CONSTRAINT "matterKeyDate_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "matter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "documentChecklistItem" (
    "id" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "status" "DocumentChecklistStatus" NOT NULL DEFAULT 'OUTSTANDING',
    "receivedAt" TIMESTAMP(3),
    "required" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL,
    "templateKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documentChecklistItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "documentChecklistItem_matterId_position_idx" ON "documentChecklistItem"("matterId", "position");

ALTER TABLE "documentChecklistItem" ADD CONSTRAINT "documentChecklistItem_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "matter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "conflictCheck" (
    "id" TEXT NOT NULL,
    "matterId" TEXT,
    "contactId" TEXT,
    "status" "ConflictCheckStatus" NOT NULL DEFAULT 'CLEAR',
    "matches" JSONB NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkedById" TEXT,
    "dismissedAt" TIMESTAMP(3),
    "dismissedById" TEXT,
    "dismissedNote" TEXT,

    CONSTRAINT "conflictCheck_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "conflictCheck_matterId_idx" ON "conflictCheck"("matterId");
CREATE INDEX "conflictCheck_contactId_idx" ON "conflictCheck"("contactId");
CREATE INDEX "conflictCheck_status_checkedAt_idx" ON "conflictCheck"("status", "checkedAt");

ALTER TABLE "conflictCheck" ADD CONSTRAINT "conflictCheck_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "matter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conflictCheck" ADD CONSTRAINT "conflictCheck_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
