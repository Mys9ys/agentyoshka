-- CreateTable
CREATE TABLE "AgentReply" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "regensUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentReply_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentReply_agentId_dateKey_idx" ON "AgentReply"("agentId", "dateKey");

-- CreateIndex
CREATE UNIQUE INDEX "AgentReply_agentId_dateKey_slotId_key" ON "AgentReply"("agentId", "dateKey", "slotId");

-- AddForeignKey
ALTER TABLE "AgentReply" ADD CONSTRAINT "AgentReply_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
