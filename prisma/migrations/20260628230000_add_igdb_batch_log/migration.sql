-- CreateTable
CREATE TABLE "IgdbBatchLog" (
    "id" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "requestedIds" INTEGER NOT NULL,
    "resolvedCount" INTEGER NOT NULL,
    "ok" BOOLEAN NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IgdbBatchLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IgdbBatchLog_operation_ok_idx" ON "IgdbBatchLog"("operation", "ok");
