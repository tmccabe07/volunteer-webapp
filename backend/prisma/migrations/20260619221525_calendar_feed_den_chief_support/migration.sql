-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CalendarFeedToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "volunteerId" TEXT,
    "denChiefId" TEXT,
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
    CONSTRAINT "CalendarFeedToken_denChiefId_fkey" FOREIGN KEY ("denChiefId") REFERENCES "DenChief" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CalendarFeedToken_denId_fkey" FOREIGN KEY ("denId") REFERENCES "Den" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CalendarFeedToken" ("createdAt", "denId", "id", "lastAccessedAt", "revokedAt", "revokedReason", "scopeType", "status", "tokenHash", "tokenPrefix", "updatedAt", "volunteerId") SELECT "createdAt", "denId", "id", "lastAccessedAt", "revokedAt", "revokedReason", "scopeType", "status", "tokenHash", "tokenPrefix", "updatedAt", "volunteerId" FROM "CalendarFeedToken";
DROP TABLE "CalendarFeedToken";
ALTER TABLE "new_CalendarFeedToken" RENAME TO "CalendarFeedToken";
CREATE UNIQUE INDEX "CalendarFeedToken_tokenHash_key" ON "CalendarFeedToken"("tokenHash");
CREATE INDEX "CalendarFeedToken_volunteerId_status_idx" ON "CalendarFeedToken"("volunteerId", "status");
CREATE INDEX "CalendarFeedToken_denChiefId_status_idx" ON "CalendarFeedToken"("denChiefId", "status");
CREATE INDEX "CalendarFeedToken_scopeType_denId_status_idx" ON "CalendarFeedToken"("scopeType", "denId", "status");
CREATE INDEX "CalendarFeedToken_denId_status_idx" ON "CalendarFeedToken"("denId", "status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
