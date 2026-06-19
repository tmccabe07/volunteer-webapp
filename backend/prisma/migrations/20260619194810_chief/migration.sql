-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DenChief" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "authTier" TEXT NOT NULL DEFAULT 'DEN_CHIEF',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "scoutbookId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);
INSERT INTO "new_DenChief" ("authTier", "createdAt", "deletedAt", "email", "firstName", "id", "isActive", "lastName", "passwordHash", "scoutbookId", "updatedAt") SELECT "authTier", "createdAt", "deletedAt", "email", "firstName", "id", "isActive", "lastName", "passwordHash", "scoutbookId", "updatedAt" FROM "DenChief";
DROP TABLE "DenChief";
ALTER TABLE "new_DenChief" RENAME TO "DenChief";
CREATE UNIQUE INDEX "DenChief_email_key" ON "DenChief"("email");
CREATE UNIQUE INDEX "DenChief_scoutbookId_key" ON "DenChief"("scoutbookId");
CREATE INDEX "DenChief_email_idx" ON "DenChief"("email");
CREATE INDEX "DenChief_isActive_idx" ON "DenChief"("isActive");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
