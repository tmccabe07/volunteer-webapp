-- CreateTable
CREATE TABLE "CalendarFeedToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "volunteerId" TEXT NOT NULL,
    "scopeType" TEXT NOT NULL,
    "denId" TEXT,
    "tokenHash" TEXT NOT NULL,
    "tokenPrefix" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "revokedReason" TEXT,
    "lastAccessedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "revokedAt" DATETIME,
    CONSTRAINT "CalendarFeedToken_volunteerId_fkey" FOREIGN KEY ("volunteerId") REFERENCES "Volunteer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CalendarFeedToken_denId_fkey" FOREIGN KEY ("denId") REFERENCES "Den" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FeedAccessAudit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenId" TEXT,
    "outcome" TEXT NOT NULL,
    "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requesterIpHash" TEXT,
    "userAgent" TEXT,
    CONSTRAINT "FeedAccessAudit_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "CalendarFeedToken" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CalendarFeedToken_tokenHash_key" ON "CalendarFeedToken"("tokenHash");

-- CreateIndex
CREATE INDEX "CalendarFeedToken_volunteerId_status_idx" ON "CalendarFeedToken"("volunteerId", "status");

-- CreateIndex
CREATE INDEX "CalendarFeedToken_scopeType_denId_status_idx" ON "CalendarFeedToken"("scopeType", "denId", "status");

-- CreateIndex
CREATE INDEX "CalendarFeedToken_denId_status_idx" ON "CalendarFeedToken"("denId", "status");

-- CreateIndex
CREATE INDEX "FeedAccessAudit_tokenId_requestedAt_idx" ON "FeedAccessAudit"("tokenId", "requestedAt");

-- CreateIndex
CREATE INDEX "FeedAccessAudit_outcome_requestedAt_idx" ON "FeedAccessAudit"("outcome", "requestedAt");
