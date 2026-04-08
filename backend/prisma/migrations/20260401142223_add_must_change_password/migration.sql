-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Volunteer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "authTier" TEXT NOT NULL DEFAULT 'PARENT',
    "leaderboardOptIn" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);
INSERT INTO "new_Volunteer" ("authTier", "createdAt", "deletedAt", "email", "id", "leaderboardOptIn", "name", "passwordHash", "phone", "updatedAt") SELECT "authTier", "createdAt", "deletedAt", "email", "id", "leaderboardOptIn", "name", "passwordHash", "phone", "updatedAt" FROM "Volunteer";
DROP TABLE "Volunteer";
ALTER TABLE "new_Volunteer" RENAME TO "Volunteer";
CREATE UNIQUE INDEX "Volunteer_email_key" ON "Volunteer"("email");
CREATE INDEX "Volunteer_email_idx" ON "Volunteer"("email");
CREATE INDEX "Volunteer_deletedAt_idx" ON "Volunteer"("deletedAt");
CREATE INDEX "Volunteer_authTier_idx" ON "Volunteer"("authTier");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
