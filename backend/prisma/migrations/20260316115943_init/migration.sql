-- CreateTable
CREATE TABLE "Volunteer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "authTier" TEXT NOT NULL DEFAULT 'PARENT',
    "leaderboardOptIn" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "ChildRank" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "volunteerId" TEXT NOT NULL,
    "rankLevel" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChildRank_volunteerId_fkey" FOREIGN KEY ("volunteerId") REFERENCES "Volunteer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VolunteerRole" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "roleType" TEXT NOT NULL,
    "specialty" TEXT,
    "rankLevel" TEXT,
    "grantsTier" TEXT NOT NULL DEFAULT 'PARENT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "VolunteerToRole" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "volunteerId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" DATETIME,
    CONSTRAINT "VolunteerToRole_volunteerId_fkey" FOREIGN KEY ("volunteerId") REFERENCES "Volunteer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VolunteerToRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "VolunteerRole" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ActivityType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "pointValue" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "eventDate" DATETIME NOT NULL,
    "eventTime" TEXT,
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

-- CreateTable
CREATE TABLE "ActivitySlot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "activityTypeId" TEXT NOT NULL,
    "capacity" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivitySlot_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ActivitySlot_activityTypeId_fkey" FOREIGN KEY ("activityTypeId") REFERENCES "ActivityType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Signup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "volunteerId" TEXT NOT NULL,
    "activitySlotId" TEXT NOT NULL,
    "withdrawn" BOOLEAN NOT NULL DEFAULT false,
    "withdrawnAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME,
    CONSTRAINT "Signup_volunteerId_fkey" FOREIGN KEY ("volunteerId") REFERENCES "Volunteer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Signup_activitySlotId_fkey" FOREIGN KEY ("activitySlotId") REFERENCES "ActivitySlot" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PointEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "volunteerId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    "referenceId" TEXT,
    "reason" TEXT,
    "createdById" TEXT NOT NULL,
    "activityTypeId" TEXT,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PointEvent_volunteerId_fkey" FOREIGN KEY ("volunteerId") REFERENCES "Volunteer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PointEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Volunteer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PointEvent_activityTypeId_fkey" FOREIGN KEY ("activityTypeId") REFERENCES "ActivityType" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VolunteerPointBalance" (
    "volunteerId" TEXT NOT NULL PRIMARY KEY,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "currentYearPoints" INTEGER NOT NULL DEFAULT 0,
    "lastUpdatedAt" DATETIME NOT NULL,
    CONSTRAINT "VolunteerPointBalance_volunteerId_fkey" FOREIGN KEY ("volunteerId") REFERENCES "Volunteer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LeaderboardCache" (
    "volunteerId" TEXT NOT NULL PRIMARY KEY,
    "rank" INTEGER,
    "totalPoints" INTEGER NOT NULL,
    "badgeTier" TEXT,
    "lastUpdatedAt" DATETIME NOT NULL,
    CONSTRAINT "LeaderboardCache_volunteerId_fkey" FOREIGN KEY ("volunteerId") REFERENCES "Volunteer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LeaderboardSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "snapshotDate" DATETIME NOT NULL,
    "volunteerId" TEXT NOT NULL,
    "rank" INTEGER,
    "totalPoints" INTEGER NOT NULL,
    "badgeTier" TEXT,
    CONSTRAINT "LeaderboardSnapshot_volunteerId_fkey" FOREIGN KEY ("volunteerId") REFERENCES "Volunteer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BadgeTier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tierName" TEXT NOT NULL,
    "minPoints" INTEGER NOT NULL,
    "maxPoints" INTEGER,
    "displayOrder" INTEGER NOT NULL,
    "badgeColor" TEXT NOT NULL,
    "iconPath" TEXT
);

-- CreateTable
CREATE TABLE "BadgeTierHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "volunteerId" TEXT NOT NULL,
    "oldTier" TEXT,
    "newTier" TEXT NOT NULL,
    "pointsAtChange" INTEGER NOT NULL,
    "achievedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BadgeTierHistory_volunteerId_fkey" FOREIGN KEY ("volunteerId") REFERENCES "Volunteer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AdminTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" DATETIME NOT NULL,
    "completionSteps" TEXT,
    "isPackWide" BOOLEAN NOT NULL DEFAULT false,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurringEndDate" DATETIME,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "AdminTask_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Volunteer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AdminTaskToRole" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminTaskToRole_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "AdminTask" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AdminTaskToRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "VolunteerRole" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaskCompletion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "volunteerId" TEXT NOT NULL,
    "completedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isComplete" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "TaskCompletion_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "AdminTask" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TaskCompletion_volunteerId_fkey" FOREIGN KEY ("volunteerId") REFERENCES "Volunteer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PackConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "packName" TEXT NOT NULL,
    "packNumber" TEXT NOT NULL,
    "yearStartDate" DATETIME NOT NULL,
    "yearEndDate" DATETIME NOT NULL,
    "activeRanks" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "volunteerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_volunteerId_fkey" FOREIGN KEY ("volunteerId") REFERENCES "Volunteer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PasswordReset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "changes" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Volunteer_email_key" ON "Volunteer"("email");

-- CreateIndex
CREATE INDEX "Volunteer_email_idx" ON "Volunteer"("email");

-- CreateIndex
CREATE INDEX "Volunteer_deletedAt_idx" ON "Volunteer"("deletedAt");

-- CreateIndex
CREATE INDEX "Volunteer_authTier_idx" ON "Volunteer"("authTier");

-- CreateIndex
CREATE INDEX "ChildRank_volunteerId_idx" ON "ChildRank"("volunteerId");

-- CreateIndex
CREATE UNIQUE INDEX "ChildRank_volunteerId_rankLevel_key" ON "ChildRank"("volunteerId", "rankLevel");

-- CreateIndex
CREATE UNIQUE INDEX "VolunteerRole_name_key" ON "VolunteerRole"("name");

-- CreateIndex
CREATE INDEX "VolunteerRole_deletedAt_idx" ON "VolunteerRole"("deletedAt");

-- CreateIndex
CREATE INDEX "VolunteerRole_roleType_idx" ON "VolunteerRole"("roleType");

-- CreateIndex
CREATE INDEX "VolunteerToRole_volunteerId_idx" ON "VolunteerToRole"("volunteerId");

-- CreateIndex
CREATE INDEX "VolunteerToRole_roleId_idx" ON "VolunteerToRole"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "VolunteerToRole_volunteerId_roleId_key" ON "VolunteerToRole"("volunteerId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityType_name_key" ON "ActivityType"("name");

-- CreateIndex
CREATE INDEX "ActivityType_deletedAt_idx" ON "ActivityType"("deletedAt");

-- CreateIndex
CREATE INDEX "ActivityType_category_idx" ON "ActivityType"("category");

-- CreateIndex
CREATE INDEX "Event_eventDate_deletedAt_idx" ON "Event"("eventDate", "deletedAt");

-- CreateIndex
CREATE INDEX "Event_rankLevel_eventDate_idx" ON "Event"("rankLevel", "eventDate");

-- CreateIndex
CREATE INDEX "Event_isComplete_eventDate_idx" ON "Event"("isComplete", "eventDate");

-- CreateIndex
CREATE INDEX "Event_createdById_idx" ON "Event"("createdById");

-- CreateIndex
CREATE INDEX "ActivitySlot_eventId_idx" ON "ActivitySlot"("eventId");

-- CreateIndex
CREATE INDEX "ActivitySlot_activityTypeId_idx" ON "ActivitySlot"("activityTypeId");

-- CreateIndex
CREATE INDEX "Signup_volunteerId_withdrawn_idx" ON "Signup"("volunteerId", "withdrawn");

-- CreateIndex
CREATE INDEX "Signup_activitySlotId_withdrawn_idx" ON "Signup"("activitySlotId", "withdrawn");

-- CreateIndex
CREATE UNIQUE INDEX "Signup_volunteerId_activitySlotId_key" ON "Signup"("volunteerId", "activitySlotId");

-- CreateIndex
CREATE INDEX "PointEvent_volunteerId_createdAt_idx" ON "PointEvent"("volunteerId", "createdAt");

-- CreateIndex
CREATE INDEX "PointEvent_eventType_idx" ON "PointEvent"("eventType");

-- CreateIndex
CREATE INDEX "PointEvent_createdById_idx" ON "PointEvent"("createdById");

-- CreateIndex
CREATE INDEX "VolunteerPointBalance_totalPoints_idx" ON "VolunteerPointBalance"("totalPoints");

-- CreateIndex
CREATE INDEX "VolunteerPointBalance_currentYearPoints_idx" ON "VolunteerPointBalance"("currentYearPoints");

-- CreateIndex
CREATE INDEX "LeaderboardCache_rank_idx" ON "LeaderboardCache"("rank");

-- CreateIndex
CREATE INDEX "LeaderboardCache_totalPoints_idx" ON "LeaderboardCache"("totalPoints");

-- CreateIndex
CREATE INDEX "LeaderboardSnapshot_snapshotDate_volunteerId_idx" ON "LeaderboardSnapshot"("snapshotDate", "volunteerId");

-- CreateIndex
CREATE UNIQUE INDEX "BadgeTier_tierName_key" ON "BadgeTier"("tierName");

-- CreateIndex
CREATE INDEX "BadgeTier_displayOrder_idx" ON "BadgeTier"("displayOrder");

-- CreateIndex
CREATE INDEX "BadgeTierHistory_volunteerId_achievedAt_idx" ON "BadgeTierHistory"("volunteerId", "achievedAt");

-- CreateIndex
CREATE INDEX "AdminTask_dueDate_deletedAt_idx" ON "AdminTask"("dueDate", "deletedAt");

-- CreateIndex
CREATE INDEX "AdminTask_isPackWide_idx" ON "AdminTask"("isPackWide");

-- CreateIndex
CREATE INDEX "AdminTask_createdById_idx" ON "AdminTask"("createdById");

-- CreateIndex
CREATE INDEX "AdminTaskToRole_taskId_idx" ON "AdminTaskToRole"("taskId");

-- CreateIndex
CREATE INDEX "AdminTaskToRole_roleId_idx" ON "AdminTaskToRole"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminTaskToRole_taskId_roleId_key" ON "AdminTaskToRole"("taskId", "roleId");

-- CreateIndex
CREATE INDEX "TaskCompletion_taskId_idx" ON "TaskCompletion"("taskId");

-- CreateIndex
CREATE INDEX "TaskCompletion_volunteerId_idx" ON "TaskCompletion"("volunteerId");

-- CreateIndex
CREATE INDEX "TaskCompletion_completedAt_idx" ON "TaskCompletion"("completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TaskCompletion_taskId_volunteerId_key" ON "TaskCompletion"("taskId", "volunteerId");

-- CreateIndex
CREATE INDEX "Notification_volunteerId_isRead_idx" ON "Notification"("volunteerId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordReset_token_key" ON "PasswordReset"("token");

-- CreateIndex
CREATE INDEX "PasswordReset_email_used_idx" ON "PasswordReset"("email", "used");

-- CreateIndex
CREATE INDEX "PasswordReset_expiresAt_idx" ON "PasswordReset"("expiresAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
