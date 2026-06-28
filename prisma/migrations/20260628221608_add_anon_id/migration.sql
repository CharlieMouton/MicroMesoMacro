-- AlterTable
ALTER TABLE "User" ADD COLUMN "anonId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_anonId_key" ON "User"("anonId");
