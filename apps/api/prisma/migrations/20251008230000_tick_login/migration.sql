-- AlterTable
ALTER TABLE "Agent" ADD COLUMN "loginStreak" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Agent" ADD COLUMN "lastLoginDateKey" TEXT;
ALTER TABLE "Agent" ADD COLUMN "lastLoginClaimDateKey" TEXT;

-- CreateTable
CREATE TABLE "DailyLoginClaim" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "streakDay" INTEGER NOT NULL,
    "coinsGranted" INTEGER NOT NULL,
    "hardwareDrop" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyLoginClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyLoginClaim_agentId_dateKey_key" ON "DailyLoginClaim"("agentId", "dateKey");

-- CreateIndex
CREATE INDEX "DailyLoginClaim_agentId_idx" ON "DailyLoginClaim"("agentId");

-- AddForeignKey
ALTER TABLE "DailyLoginClaim" ADD CONSTRAINT "DailyLoginClaim_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
