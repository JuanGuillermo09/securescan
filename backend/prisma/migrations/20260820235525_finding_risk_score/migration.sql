-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Finding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "auditId" TEXT NOT NULL,
    "refId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "confidence" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evidence" TEXT NOT NULL,
    "impact" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "impactLevel" INTEGER NOT NULL DEFAULT 0,
    "probabilityLevel" INTEGER NOT NULL DEFAULT 0,
    "exposureLevel" INTEGER NOT NULL DEFAULT 0,
    "owaspJson" TEXT NOT NULL DEFAULT '[]',
    "cweJson" TEXT NOT NULL DEFAULT '[]',
    "cveJson" TEXT NOT NULL DEFAULT '[]',
    "isoJson" TEXT NOT NULL DEFAULT '[]',
    CONSTRAINT "Finding_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Finding" ("auditId", "category", "confidence", "cveJson", "cweJson", "description", "evidence", "id", "impact", "isoJson", "owaspJson", "recommendation", "refId", "severity", "title") SELECT "auditId", "category", "confidence", "cveJson", "cweJson", "description", "evidence", "id", "impact", "isoJson", "owaspJson", "recommendation", "refId", "severity", "title" FROM "Finding";
DROP TABLE "Finding";
ALTER TABLE "new_Finding" RENAME TO "Finding";
CREATE INDEX "Finding_auditId_idx" ON "Finding"("auditId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
