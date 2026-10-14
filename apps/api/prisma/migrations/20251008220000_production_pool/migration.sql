-- CreateTable
CREATE TABLE "ProductionRun" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "weekday" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "baseCoinsPerHour" INTEGER NOT NULL,
    "baseBufferCap" INTEGER NOT NULL,
    "bonusCoinsPerHour" INTEGER NOT NULL DEFAULT 0,
    "unclaimed" INTEGER NOT NULL DEFAULT 0,
    "lastTickAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductionRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductionRun_agentId_idx" ON "ProductionRun"("agentId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionRun_agentId_dateKey_eventId_key" ON "ProductionRun"("agentId", "dateKey", "eventId");

-- AddForeignKey
ALTER TABLE "ProductionRun" ADD CONSTRAINT "ProductionRun_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
