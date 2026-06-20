-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "senderId" TEXT NOT NULL,
    "templateType" TEXT NOT NULL,
    "eventId" TEXT,
    "taskId" TEXT,
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "EmailRecipientLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "emailLogId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "failureReason" TEXT,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailRecipientLog_emailLogId_fkey" FOREIGN KEY ("emailLogId") REFERENCES "EmailLog" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "EmailLog_eventId_templateType_sentAt_idx" ON "EmailLog"("eventId", "templateType", "sentAt");

-- CreateIndex
CREATE INDEX "EmailLog_taskId_templateType_sentAt_idx" ON "EmailLog"("taskId", "templateType", "sentAt");

-- CreateIndex
CREATE INDEX "EmailLog_senderId_idx" ON "EmailLog"("senderId");

-- CreateIndex
CREATE INDEX "EmailRecipientLog_emailLogId_idx" ON "EmailRecipientLog"("emailLogId");

-- CreateIndex
CREATE INDEX "EmailRecipientLog_recipientId_idx" ON "EmailRecipientLog"("recipientId");
