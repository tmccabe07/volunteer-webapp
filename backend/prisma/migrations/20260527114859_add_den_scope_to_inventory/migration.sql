-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_InventoryItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemName" TEXT NOT NULL,
    "rankLevel" TEXT,
    "denId" TEXT,
    "onHandQuantity" INTEGER NOT NULL DEFAULT 0,
    "reorderPoint" INTEGER,
    "unitCost" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "InventoryItem_denId_fkey" FOREIGN KEY ("denId") REFERENCES "Den" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_InventoryItem" ("createdAt", "deletedAt", "id", "itemName", "onHandQuantity", "rankLevel", "reorderPoint", "unitCost", "updatedAt") SELECT "createdAt", "deletedAt", "id", "itemName", "onHandQuantity", "rankLevel", "reorderPoint", "unitCost", "updatedAt" FROM "InventoryItem";
DROP TABLE "InventoryItem";
ALTER TABLE "new_InventoryItem" RENAME TO "InventoryItem";
CREATE INDEX "InventoryItem_onHandQuantity_reorderPoint_idx" ON "InventoryItem"("onHandQuantity", "reorderPoint");
CREATE INDEX "InventoryItem_denId_idx" ON "InventoryItem"("denId");
CREATE UNIQUE INDEX "InventoryItem_itemName_rankLevel_denId_key" ON "InventoryItem"("itemName", "rankLevel", "denId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
