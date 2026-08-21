-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Audit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "url" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "score" INTEGER,
    "grade" TEXT,
    "criticalCount" INTEGER NOT NULL DEFAULT 0,
    "highCount" INTEGER NOT NULL DEFAULT 0,
    "mediumCount" INTEGER NOT NULL DEFAULT 0,
    "lowCount" INTEGER NOT NULL DEFAULT 0,
    "infoCount" INTEGER NOT NULL DEFAULT 0,
    "technologiesJson" TEXT NOT NULL DEFAULT '[]',
    "rawResultsJson" TEXT NOT NULL DEFAULT '{}',
    "analyzerErrorsJson" TEXT NOT NULL DEFAULT '[]',
    "errorMessage" TEXT,
    "isExample" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Audit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Audit" ("analyzerErrorsJson", "criticalCount", "domain", "errorMessage", "finishedAt", "grade", "highCount", "id", "infoCount", "lowCount", "mediumCount", "rawResultsJson", "score", "startedAt", "status", "technologiesJson", "url", "userId") SELECT "analyzerErrorsJson", "criticalCount", "domain", "errorMessage", "finishedAt", "grade", "highCount", "id", "infoCount", "lowCount", "mediumCount", "rawResultsJson", "score", "startedAt", "status", "technologiesJson", "url", "userId" FROM "Audit";
DROP TABLE "Audit";
ALTER TABLE "new_Audit" RENAME TO "Audit";
CREATE INDEX "Audit_startedAt_idx" ON "Audit"("startedAt");
CREATE INDEX "Audit_userId_idx" ON "Audit"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
