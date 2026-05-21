-- AlterTable
ALTER TABLE "ActivitySlot" ADD COLUMN "description" TEXT;

-- CreateTable
CREATE TABLE "ActivitySlotStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "activitySlotId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "stepText" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivitySlotStep_activitySlotId_fkey" FOREIGN KEY ("activitySlotId") REFERENCES "ActivitySlot" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
INSERT INTO "new_Event" ("createdAt", "createdById", "deletedAt", "description", "eventDate", "eventTime", "id", "isComplete", "isRecurring", "location", "rankLevel", "recurringEndDate", "title", "updatedAt") SELECT "createdAt", "createdById", "deletedAt", "description", "eventDate", "eventTime", "id", "isComplete", "isRecurring", "location", "rankLevel", "recurringEndDate", "title", "updatedAt" FROM "Event";
DROP TABLE "Event";
ALTER TABLE "new_Event" RENAME TO "Event";
CREATE INDEX "Event_eventDate_deletedAt_idx" ON "Event"("eventDate", "deletedAt");
CREATE INDEX "Event_rankLevel_eventDate_idx" ON "Event"("rankLevel", "eventDate");
CREATE INDEX "Event_isComplete_eventDate_idx" ON "Event"("isComplete", "eventDate");
CREATE INDEX "Event_createdById_idx" ON "Event"("createdById");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ActivitySlotStep_activitySlotId_orderIndex_idx" ON "ActivitySlotStep"("activitySlotId", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "ActivitySlotStep_activitySlotId_orderIndex_key" ON "ActivitySlotStep"("activitySlotId", "orderIndex");
