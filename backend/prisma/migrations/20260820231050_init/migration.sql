-- CreateTable
CREATE TABLE "Audit" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "errorMessage" TEXT
);

-- CreateTable
CREATE TABLE "Finding" (
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
    "owaspJson" TEXT NOT NULL DEFAULT '[]',
    "cweJson" TEXT NOT NULL DEFAULT '[]',
    "cveJson" TEXT NOT NULL DEFAULT '[]',
    "isoJson" TEXT NOT NULL DEFAULT '[]',
    CONSTRAINT "Finding_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Audit_startedAt_idx" ON "Audit"("startedAt");

-- CreateIndex
CREATE INDEX "Finding_auditId_idx" ON "Finding"("auditId");
