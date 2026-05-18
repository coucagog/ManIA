-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Expert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "institution" TEXT,
    "bio" TEXT,
    "photoUrl" TEXT,
    "speakerKey" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Expert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Expert" ("bio", "createdAt", "id", "institution", "name", "order", "photoUrl", "speakerKey", "title") SELECT "bio", "createdAt", "id", "institution", "name", "order", "photoUrl", "speakerKey", "title" FROM "Expert";
DROP TABLE "Expert";
ALTER TABLE "new_Expert" RENAME TO "Expert";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
