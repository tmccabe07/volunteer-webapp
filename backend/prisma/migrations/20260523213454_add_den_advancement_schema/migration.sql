-- CreateTable
CREATE TABLE "ChildScout" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "currentRank" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "scoutbookId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "Den" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "denNumber" INTEGER NOT NULL,
    "rankLevel" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "DenMembership" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "denId" TEXT NOT NULL,
    "childScoutId" TEXT NOT NULL,
    "validFrom" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validTo" DATETIME,
    "assignedBy" TEXT,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DenMembership_denId_fkey" FOREIGN KEY ("denId") REFERENCES "Den" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DenMembership_childScoutId_fkey" FOREIGN KEY ("childScoutId") REFERENCES "ChildScout" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DenChief" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "authTier" TEXT NOT NULL DEFAULT 'PARENT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "scoutbookId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "DenChiefAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "denChiefId" TEXT NOT NULL,
    "denId" TEXT NOT NULL,
    "validFrom" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validTo" DATETIME,
    "assignedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DenChiefAssignment_denChiefId_fkey" FOREIGN KEY ("denChiefId") REFERENCES "DenChief" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DenChiefAssignment_denId_fkey" FOREIGN KEY ("denId") REFERENCES "Den" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ParentChildLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parentId" TEXT NOT NULL,
    "childScoutId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "relationshipType" TEXT,
    "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestedBy" TEXT NOT NULL,
    "processedAt" DATETIME,
    "processedBy" TEXT,
    "rejectionReason" TEXT,
    CONSTRAINT "ParentChildLink_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Volunteer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ParentChildLink_childScoutId_fkey" FOREIGN KEY ("childScoutId") REFERENCES "ChildScout" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ParentChildLink_processedBy_fkey" FOREIGN KEY ("processedBy") REFERENCES "Volunteer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Rank" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rankLevel" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "description" TEXT,
    "catalogYear" TEXT NOT NULL DEFAULT '2024',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "requiredAdventureCount" INTEGER NOT NULL,
    "electiveAdventureCount" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Adventure" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rankId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "classification" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "catalogYear" TEXT NOT NULL DEFAULT '2024',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Adventure_rankId_fkey" FOREIGN KEY ("rankId") REFERENCES "Rank" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Requirement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adventureId" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "requirementText" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Requirement_adventureId_fkey" FOREIGN KEY ("adventureId") REFERENCES "Adventure" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RequirementProgress" (
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
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "RequirementProgress_childScoutId_fkey" FOREIGN KEY ("childScoutId") REFERENCES "ChildScout" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RequirementProgress_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RequirementProgress_adventureId_fkey" FOREIGN KEY ("adventureId") REFERENCES "Adventure" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChildAttendance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "childScoutId" TEXT NOT NULL,
    "attendanceStatus" TEXT NOT NULL DEFAULT 'PRESENT',
    "recordedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedBy" TEXT NOT NULL,
    "notes" TEXT,
    CONSTRAINT "ChildAttendance_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "DenEvent" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChildAttendance_childScoutId_fkey" FOREIGN KEY ("childScoutId") REFERENCES "ChildScout" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DenEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "denId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "eventDate" DATETIME NOT NULL,
    "eventTime" TEXT,
    "endTime" TEXT,
    "fullDay" BOOLEAN NOT NULL DEFAULT false,
    "location" TEXT,
    "sendPostMeetingNotification" BOOLEAN NOT NULL DEFAULT true,
    "hourPromptDefaults" JSONB,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "DenEvent_denId_fkey" FOREIGN KEY ("denId") REFERENCES "Den" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AwardItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "childScoutId" TEXT NOT NULL,
    "adventureId" TEXT,
    "specialAwardId" TEXT,
    "currentState" TEXT NOT NULL DEFAULT 'ELIGIBLE',
    "quantityNeeded" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AwardItem_childScoutId_fkey" FOREIGN KEY ("childScoutId") REFERENCES "ChildScout" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AwardItem_adventureId_fkey" FOREIGN KEY ("adventureId") REFERENCES "Adventure" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AwardItem_specialAwardId_fkey" FOREIGN KEY ("specialAwardId") REFERENCES "SpecialAward" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AwardStateHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "awardItemId" TEXT NOT NULL,
    "fromState" TEXT,
    "toState" TEXT NOT NULL,
    "changedBy" TEXT NOT NULL,
    "changedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "batchId" TEXT,
    CONSTRAINT "AwardStateHistory_awardItemId_fkey" FOREIGN KEY ("awardItemId") REFERENCES "AwardItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SpecialAward" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "requiresNomination" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemName" TEXT NOT NULL,
    "rankLevel" TEXT,
    "onHandQuantity" INTEGER NOT NULL DEFAULT 0,
    "reorderPoint" INTEGER,
    "unitCost" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "InventoryAdjustment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inventoryItemId" TEXT NOT NULL,
    "quantityChange" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "adjustedBy" TEXT NOT NULL,
    "adjustedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "linkedBatchId" TEXT,
    CONSTRAINT "InventoryAdjustment_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ScoutbookPrompt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "childScoutId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "categoryData" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" DATETIME,
    "acknowledgedAt" DATETIME,
    "dismissedAt" DATETIME,
    "reminderSentAt" DATETIME,
    CONSTRAINT "ScoutbookPrompt_childScoutId_fkey" FOREIGN KEY ("childScoutId") REFERENCES "ChildScout" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ScoutbookPrompt_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "DenEvent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fileName" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "successRows" INTEGER NOT NULL DEFAULT 0,
    "failedRows" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "ImportError" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "fieldName" TEXT,
    "errorMessage" TEXT NOT NULL,
    "rowData" JSONB NOT NULL,
    CONSTRAINT "ImportError_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ImportBatch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RolloverBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "executedBy" TEXT NOT NULL,
    "executedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "targetYear" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "densProcessed" INTEGER NOT NULL DEFAULT 0,
    "childrenProcessed" INTEGER NOT NULL DEFAULT 0,
    "childrenFailed" INTEGER NOT NULL DEFAULT 0,
    "isDryRun" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "RolloverError" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "childScoutId" TEXT NOT NULL,
    "errorMessage" TEXT NOT NULL,
    CONSTRAINT "RolloverError_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "RolloverBatch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_ChildAttendanceToRequirement" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_ChildAttendanceToRequirement_A_fkey" FOREIGN KEY ("A") REFERENCES "ChildAttendance" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_ChildAttendanceToRequirement_B_fkey" FOREIGN KEY ("B") REFERENCES "Requirement" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_VolunteerRole" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "roleType" TEXT NOT NULL,
    "specialty" TEXT,
    "rankLevel" TEXT,
    "grantsTier" TEXT NOT NULL DEFAULT 'PARENT',
    "scopeType" TEXT NOT NULL DEFAULT 'DEN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);
INSERT INTO "new_VolunteerRole" ("createdAt", "deletedAt", "description", "grantsTier", "id", "name", "rankLevel", "roleType", "specialty", "updatedAt") SELECT "createdAt", "deletedAt", "description", "grantsTier", "id", "name", "rankLevel", "roleType", "specialty", "updatedAt" FROM "VolunteerRole";
DROP TABLE "VolunteerRole";
ALTER TABLE "new_VolunteerRole" RENAME TO "VolunteerRole";
CREATE UNIQUE INDEX "VolunteerRole_name_key" ON "VolunteerRole"("name");
CREATE INDEX "VolunteerRole_deletedAt_idx" ON "VolunteerRole"("deletedAt");
CREATE INDEX "VolunteerRole_roleType_idx" ON "VolunteerRole"("roleType");
CREATE INDEX "VolunteerRole_scopeType_rankLevel_idx" ON "VolunteerRole"("scopeType", "rankLevel");
CREATE TABLE "new_VolunteerToRole" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "volunteerId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "denNumber" INTEGER,
    "denId" TEXT,
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" DATETIME,
    CONSTRAINT "VolunteerToRole_volunteerId_fkey" FOREIGN KEY ("volunteerId") REFERENCES "Volunteer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VolunteerToRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "VolunteerRole" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "VolunteerToRole_denId_fkey" FOREIGN KEY ("denId") REFERENCES "Den" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_VolunteerToRole" ("assignedAt", "id", "removedAt", "roleId", "volunteerId") SELECT "assignedAt", "id", "removedAt", "roleId", "volunteerId" FROM "VolunteerToRole";
DROP TABLE "VolunteerToRole";
ALTER TABLE "new_VolunteerToRole" RENAME TO "VolunteerToRole";
CREATE INDEX "VolunteerToRole_volunteerId_idx" ON "VolunteerToRole"("volunteerId");
CREATE INDEX "VolunteerToRole_roleId_idx" ON "VolunteerToRole"("roleId");
CREATE INDEX "VolunteerToRole_denNumber_idx" ON "VolunteerToRole"("denNumber");
CREATE INDEX "VolunteerToRole_denId_idx" ON "VolunteerToRole"("denId");
CREATE UNIQUE INDEX "VolunteerToRole_volunteerId_roleId_denNumber_key" ON "VolunteerToRole"("volunteerId", "roleId", "denNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ChildScout_scoutbookId_key" ON "ChildScout"("scoutbookId");

-- CreateIndex
CREATE INDEX "ChildScout_currentRank_isActive_idx" ON "ChildScout"("currentRank", "isActive");

-- CreateIndex
CREATE INDEX "ChildScout_lastName_firstName_idx" ON "ChildScout"("lastName", "firstName");

-- CreateIndex
CREATE INDEX "ChildScout_deletedAt_idx" ON "ChildScout"("deletedAt");

-- CreateIndex
CREATE INDEX "Den_rankLevel_isActive_idx" ON "Den"("rankLevel", "isActive");

-- CreateIndex
CREATE INDEX "Den_denNumber_idx" ON "Den"("denNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Den_denNumber_deletedAt_key" ON "Den"("denNumber", "deletedAt");

-- CreateIndex
CREATE INDEX "DenMembership_childScoutId_validTo_idx" ON "DenMembership"("childScoutId", "validTo");

-- CreateIndex
CREATE INDEX "DenMembership_denId_validTo_idx" ON "DenMembership"("denId", "validTo");

-- CreateIndex
CREATE INDEX "DenMembership_validFrom_validTo_idx" ON "DenMembership"("validFrom", "validTo");

-- CreateIndex
CREATE UNIQUE INDEX "DenChief_email_key" ON "DenChief"("email");

-- CreateIndex
CREATE UNIQUE INDEX "DenChief_scoutbookId_key" ON "DenChief"("scoutbookId");

-- CreateIndex
CREATE INDEX "DenChief_email_idx" ON "DenChief"("email");

-- CreateIndex
CREATE INDEX "DenChief_isActive_idx" ON "DenChief"("isActive");

-- CreateIndex
CREATE INDEX "DenChiefAssignment_denChiefId_validTo_idx" ON "DenChiefAssignment"("denChiefId", "validTo");

-- CreateIndex
CREATE INDEX "DenChiefAssignment_denId_validTo_idx" ON "DenChiefAssignment"("denId", "validTo");

-- CreateIndex
CREATE INDEX "ParentChildLink_status_requestedAt_idx" ON "ParentChildLink"("status", "requestedAt");

-- CreateIndex
CREATE INDEX "ParentChildLink_childScoutId_idx" ON "ParentChildLink"("childScoutId");

-- CreateIndex
CREATE INDEX "ParentChildLink_parentId_idx" ON "ParentChildLink"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "ParentChildLink_parentId_childScoutId_status_key" ON "ParentChildLink"("parentId", "childScoutId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Rank_rankLevel_key" ON "Rank"("rankLevel");

-- CreateIndex
CREATE UNIQUE INDEX "Rank_displayOrder_key" ON "Rank"("displayOrder");

-- CreateIndex
CREATE INDEX "Rank_catalogYear_isActive_idx" ON "Rank"("catalogYear", "isActive");

-- CreateIndex
CREATE INDEX "Rank_displayOrder_idx" ON "Rank"("displayOrder");

-- CreateIndex
CREATE INDEX "Adventure_rankId_classification_idx" ON "Adventure"("rankId", "classification");

-- CreateIndex
CREATE INDEX "Adventure_catalogYear_isActive_idx" ON "Adventure"("catalogYear", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Adventure_rankId_name_catalogYear_key" ON "Adventure"("rankId", "name", "catalogYear");

-- CreateIndex
CREATE INDEX "Requirement_adventureId_displayOrder_idx" ON "Requirement"("adventureId", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Requirement_adventureId_displayOrder_key" ON "Requirement"("adventureId", "displayOrder");

-- CreateIndex
CREATE INDEX "RequirementProgress_childScoutId_idx" ON "RequirementProgress"("childScoutId");

-- CreateIndex
CREATE INDEX "RequirementProgress_requirementId_idx" ON "RequirementProgress"("requirementId");

-- CreateIndex
CREATE INDEX "RequirementProgress_adventureId_idx" ON "RequirementProgress"("adventureId");

-- CreateIndex
CREATE INDEX "RequirementProgress_scoutbookStatus_completedAt_idx" ON "RequirementProgress"("scoutbookStatus", "completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RequirementProgress_childScoutId_requirementId_key" ON "RequirementProgress"("childScoutId", "requirementId");

-- CreateIndex
CREATE INDEX "ChildAttendance_childScoutId_attendanceStatus_idx" ON "ChildAttendance"("childScoutId", "attendanceStatus");

-- CreateIndex
CREATE INDEX "ChildAttendance_eventId_idx" ON "ChildAttendance"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "ChildAttendance_eventId_childScoutId_key" ON "ChildAttendance"("eventId", "childScoutId");

-- CreateIndex
CREATE INDEX "DenEvent_denId_eventDate_idx" ON "DenEvent"("denId", "eventDate");

-- CreateIndex
CREATE INDEX "DenEvent_eventDate_deletedAt_idx" ON "DenEvent"("eventDate", "deletedAt");

-- CreateIndex
CREATE INDEX "AwardItem_currentState_idx" ON "AwardItem"("currentState");

-- CreateIndex
CREATE INDEX "AwardItem_childScoutId_currentState_idx" ON "AwardItem"("childScoutId", "currentState");

-- CreateIndex
CREATE INDEX "AwardItem_adventureId_idx" ON "AwardItem"("adventureId");

-- CreateIndex
CREATE INDEX "AwardItem_specialAwardId_idx" ON "AwardItem"("specialAwardId");

-- CreateIndex
CREATE INDEX "AwardStateHistory_awardItemId_changedAt_idx" ON "AwardStateHistory"("awardItemId", "changedAt");

-- CreateIndex
CREATE INDEX "AwardStateHistory_batchId_idx" ON "AwardStateHistory"("batchId");

-- CreateIndex
CREATE UNIQUE INDEX "SpecialAward_name_key" ON "SpecialAward"("name");

-- CreateIndex
CREATE INDEX "SpecialAward_category_idx" ON "SpecialAward"("category");

-- CreateIndex
CREATE INDEX "InventoryItem_onHandQuantity_reorderPoint_idx" ON "InventoryItem"("onHandQuantity", "reorderPoint");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_itemName_rankLevel_key" ON "InventoryItem"("itemName", "rankLevel");

-- CreateIndex
CREATE INDEX "InventoryAdjustment_inventoryItemId_adjustedAt_idx" ON "InventoryAdjustment"("inventoryItemId", "adjustedAt");

-- CreateIndex
CREATE INDEX "ScoutbookPrompt_childScoutId_status_idx" ON "ScoutbookPrompt"("childScoutId", "status");

-- CreateIndex
CREATE INDEX "ScoutbookPrompt_category_status_idx" ON "ScoutbookPrompt"("category", "status");

-- CreateIndex
CREATE INDEX "ScoutbookPrompt_eventId_idx" ON "ScoutbookPrompt"("eventId");

-- CreateIndex
CREATE INDEX "ImportBatch_uploadedAt_status_idx" ON "ImportBatch"("uploadedAt", "status");

-- CreateIndex
CREATE INDEX "ImportError_batchId_rowNumber_idx" ON "ImportError"("batchId", "rowNumber");

-- CreateIndex
CREATE INDEX "RolloverBatch_targetYear_status_idx" ON "RolloverBatch"("targetYear", "status");

-- CreateIndex
CREATE INDEX "RolloverError_batchId_idx" ON "RolloverError"("batchId");

-- CreateIndex
CREATE UNIQUE INDEX "_ChildAttendanceToRequirement_AB_unique" ON "_ChildAttendanceToRequirement"("A", "B");

-- CreateIndex
CREATE INDEX "_ChildAttendanceToRequirement_B_index" ON "_ChildAttendanceToRequirement"("B");
