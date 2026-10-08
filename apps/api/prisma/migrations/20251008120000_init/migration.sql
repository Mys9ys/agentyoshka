-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL DEFAULT 'Агентёшка',
    "baseSkinId" TEXT NOT NULL DEFAULT 'bear_cream',
    "level" INTEGER NOT NULL DEFAULT 1,
    "cultureXp" INTEGER NOT NULL DEFAULT 0,
    "trainingGrade" TEXT NOT NULL DEFAULT 'G0',
    "cultureTrack" TEXT NOT NULL DEFAULT 'neutral',
    "coins" INTEGER NOT NULL DEFAULT 0,
    "scenarioDayKey" TEXT NOT NULL DEFAULT 'monday',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyState" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "choiceKey" TEXT,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_userId_key" ON "Agent"("userId");

-- CreateIndex
CREATE INDEX "DailyState_agentId_dateKey_idx" ON "DailyState"("agentId", "dateKey");

-- CreateIndex
CREATE UNIQUE INDEX "DailyState_agentId_dateKey_eventId_key" ON "DailyState"("agentId", "dateKey", "eventId");

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyState" ADD CONSTRAINT "DailyState_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
