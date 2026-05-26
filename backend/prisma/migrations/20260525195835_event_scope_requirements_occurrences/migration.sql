-- CreateTable
CREATE TABLE "EventTargetDen" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "denId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventTargetDen_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventTargetDen_denId_fkey" FOREIGN KEY ("denId") REFERENCES "Den" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EventPlannedRequirement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventPlannedRequirement_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventPlannedRequirement_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RequirementCoverageOccurrence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "childScoutId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "adventureId" TEXT NOT NULL,
    "eventId" TEXT,
    "completionType" TEXT NOT NULL,
    "notes" TEXT,
    "recordedBy" TEXT NOT NULL,
    "recordedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'MEETING_ATTENDANCE',
    CONSTRAINT "RequirementCoverageOccurrence_childScoutId_fkey" FOREIGN KEY ("childScoutId") REFERENCES "ChildScout" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RequirementCoverageOccurrence_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RequirementCoverageOccurrence_adventureId_fkey" FOREIGN KEY ("adventureId") REFERENCES "Adventure" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RequirementCoverageOccurrence_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "eventDate" DATETIME NOT NULL,
    "eventTime" TEXT,
    "endTime" TEXT,
    "fullDay" BOOLEAN NOT NULL DEFAULT false,
    "location" TEXT,
    "scopeType" TEXT NOT NULL DEFAULT 'PACK_WIDE',
    "rankLevel" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "recurringEndDate" DATETIME,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Event_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Volunteer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Event" ("createdAt", "createdById", "deletedAt", "description", "endTime", "eventDate", "eventTime", "fullDay", "id", "isComplete", "isRecurring", "location", "rankLevel", "recurringEndDate", "title", "updatedAt") SELECT "createdAt", "createdById", "deletedAt", "description", "endTime", "eventDate", "eventTime", "fullDay", "id", "isComplete", "isRecurring", "location", "rankLevel", "recurringEndDate", "title", "updatedAt" FROM "Event";
DROP TABLE "Event";
ALTER TABLE "new_Event" RENAME TO "Event";
CREATE INDEX "Event_eventDate_deletedAt_idx" ON "Event"("eventDate", "deletedAt");
CREATE INDEX "Event_rankLevel_eventDate_idx" ON "Event"("rankLevel", "eventDate");
CREATE INDEX "Event_isComplete_eventDate_idx" ON "Event"("isComplete", "eventDate");
CREATE INDEX "Event_createdById_idx" ON "Event"("createdById");
CREATE INDEX "Event_scopeType_eventDate_idx" ON "Event"("scopeType", "eventDate");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "EventTargetDen_denId_idx" ON "EventTargetDen"("denId");

-- CreateIndex
CREATE UNIQUE INDEX "EventTargetDen_eventId_denId_key" ON "EventTargetDen"("eventId", "denId");

-- CreateIndex
CREATE INDEX "EventPlannedRequirement_requirementId_idx" ON "EventPlannedRequirement"("requirementId");

-- CreateIndex
CREATE UNIQUE INDEX "EventPlannedRequirement_eventId_requirementId_key" ON "EventPlannedRequirement"("eventId", "requirementId");

-- CreateIndex
CREATE INDEX "RequirementCoverageOccurrence_childScoutId_recordedAt_idx" ON "RequirementCoverageOccurrence"("childScoutId", "recordedAt");

-- CreateIndex
CREATE INDEX "RequirementCoverageOccurrence_requirementId_recordedAt_idx" ON "RequirementCoverageOccurrence"("requirementId", "recordedAt");

-- CreateIndex
CREATE INDEX "RequirementCoverageOccurrence_eventId_idx" ON "RequirementCoverageOccurrence"("eventId");
