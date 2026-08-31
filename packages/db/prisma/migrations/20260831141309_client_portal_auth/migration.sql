-- CreateTable
CREATE TABLE "clientAccount" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientLoginToken" (
    "id" TEXT NOT NULL,
    "clientAccountId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clientLoginToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientSession" (
    "id" TEXT NOT NULL,
    "clientAccountId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clientSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clientAccount_contactId_key" ON "clientAccount"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "clientAccount_email_key" ON "clientAccount"("email");

-- CreateIndex
CREATE UNIQUE INDEX "clientLoginToken_tokenHash_key" ON "clientLoginToken"("tokenHash");

-- CreateIndex
CREATE INDEX "clientLoginToken_clientAccountId_idx" ON "clientLoginToken"("clientAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "clientSession_tokenHash_key" ON "clientSession"("tokenHash");

-- CreateIndex
CREATE INDEX "clientSession_clientAccountId_idx" ON "clientSession"("clientAccountId");

-- AddForeignKey
ALTER TABLE "clientAccount" ADD CONSTRAINT "clientAccount_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientLoginToken" ADD CONSTRAINT "clientLoginToken_clientAccountId_fkey" FOREIGN KEY ("clientAccountId") REFERENCES "clientAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientSession" ADD CONSTRAINT "clientSession_clientAccountId_fkey" FOREIGN KEY ("clientAccountId") REFERENCES "clientAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
