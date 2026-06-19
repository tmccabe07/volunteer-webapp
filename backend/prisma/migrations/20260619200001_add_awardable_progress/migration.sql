-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RequirementProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "childScoutId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "adventureId" TEXT NOT NULL,
    "completedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedBy" TEXT NOT NULL,
    "completionType" TEXT NOT NULL DEFAULT 'MEETING',
    "notes" TEXT,
    "scoutbookStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "scoutbookEnteredAt" DATETIME,
    "scoutbookEnteredBy" TEXT,
    "scoutbookNotes" TEXT,
    "awardable" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "RequirementProgress_childScoutId_fkey" FOREIGN KEY ("childScoutId") REFERENCES "ChildScout" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RequirementProgress_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RequirementProgress_adventureId_fkey" FOREIGN KEY ("adventureId") REFERENCES "Adventure" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_RequirementProgress" ("adventureId", "childScoutId", "completedAt", "completedBy", "completionType", "id", "notes", "requirementId", "scoutbookEnteredAt", "scoutbookEnteredBy", "scoutbookNotes", "scoutbookStatus", "version") SELECT "adventureId", "childScoutId", "completedAt", "completedBy", "completionType", "id", "notes", "requirementId", "scoutbookEnteredAt", "scoutbookEnteredBy", "scoutbookNotes", "scoutbookStatus", "version" FROM "RequirementProgress";
DROP TABLE "RequirementProgress";
ALTER TABLE "new_RequirementProgress" RENAME TO "RequirementProgress";
CREATE INDEX "RequirementProgress_childScoutId_idx" ON "RequirementProgress"("childScoutId");
CREATE INDEX "RequirementProgress_requirementId_idx" ON "RequirementProgress"("requirementId");
CREATE INDEX "RequirementProgress_adventureId_idx" ON "RequirementProgress"("adventureId");
CREATE INDEX "RequirementProgress_scoutbookStatus_completedAt_idx" ON "RequirementProgress"("scoutbookStatus", "completedAt");
CREATE INDEX "RequirementProgress_childScoutId_adventureId_awardable_idx" ON "RequirementProgress"("childScoutId", "adventureId", "awardable");
CREATE UNIQUE INDEX "RequirementProgress_childScoutId_requirementId_key" ON "RequirementProgress"("childScoutId", "requirementId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
