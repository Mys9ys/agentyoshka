-- CreateTable
CREATE TABLE "AgentPurchase" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AgentPurchase_agentId_itemId_key" ON "AgentPurchase"("agentId", "itemId");

-- CreateIndex
CREATE INDEX "AgentPurchase_agentId_idx" ON "AgentPurchase"("agentId");

-- AddForeignKey
ALTER TABLE "AgentPurchase" ADD CONSTRAINT "AgentPurchase_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
