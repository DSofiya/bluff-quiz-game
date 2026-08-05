-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'HOST', 'PLAYER', 'SPECTATOR');

-- CreateEnum
CREATE TYPE "GamePhase" AS ENUM ('LOBBY', 'ANSWER_PHASE', 'ANSWER_PHASE_COMPLETE', 'VOTING_PHASE', 'ROUND_RESULTS', 'FINAL_RESULTS', 'FINISHED');

-- CreateEnum
CREATE TYPE "CaptainPhase" AS ENUM ('ANSWER', 'VOTE');

-- CreateEnum
CREATE TYPE "SelectedAnswerType" AS ENUM ('CORRECT', 'TEAM_FAKE', 'ADMIN_WRONG');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT,
    "role" "UserRole" NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameTemplate" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "teamCount" INTEGER NOT NULL,
    "playerCount" INTEGER NOT NULL,
    "answerTimeLimit" INTEGER NOT NULL,
    "voteTimeLimit" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameState" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateQuestion" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "correctAnswer" TEXT NOT NULL,
    "wrongAnswer" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "TemplateQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "templateId" TEXT,
    "adminId" TEXT NOT NULL,
    "hostId" TEXT,
    "status" "GamePhase" NOT NULL DEFAULT 'LOBBY',
    "teamCount" INTEGER NOT NULL,
    "playerCount" INTEGER NOT NULL,
    "questionCount" INTEGER NOT NULL,
    "answerTimeLimit" INTEGER NOT NULL,
    "voteTimeLimit" INTEGER NOT NULL,
    "currentQuestionIndex" INTEGER NOT NULL DEFAULT 0,
    "allowOwnAnswerVote" BOOLEAN NOT NULL DEFAULT false,
    "showCorrectAnswer" BOOLEAN NOT NULL DEFAULT true,
    "phaseStartedAt" TIMESTAMP(3),
    "phaseEndsAt" TIMESTAMP(3),
    "timerPausedAt" TIMESTAMP(3),
    "totalPausedSeconds" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "correctAnswer" TEXT NOT NULL,
    "wrongAnswer" TEXT NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameQuestion" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "GameQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamAnswer" (
    "id" TEXT NOT NULL,
    "gameQuestionId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "captainUserId" TEXT NOT NULL,
    "answerText" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnswerOption" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "gameQuestionId" TEXT NOT NULL,
    "type" "SelectedAnswerType" NOT NULL,
    "text" TEXT NOT NULL,
    "teamId" TEXT,
    "order" INTEGER NOT NULL,

    CONSTRAINT "AnswerOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL,
    "gameQuestionId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "captainUserId" TEXT NOT NULL,
    "selectedAnswerId" TEXT NOT NULL,
    "selectedAnswerType" "SelectedAnswerType" NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhaseCaptain" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phase" "CaptainPhase" NOT NULL,

    CONSTRAINT "PhaseCaptain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreEvent" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "gameQuestionId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,

    CONSTRAINT "ScoreEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "GameState_code_key" ON "GameState"("code");

-- CreateIndex
CREATE UNIQUE INDEX "TemplateQuestion_templateId_order_key" ON "TemplateQuestion"("templateId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Game_code_key" ON "Game"("code");

-- CreateIndex
CREATE UNIQUE INDEX "GameQuestion_gameId_order_key" ON "GameQuestion"("gameId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "TeamAnswer_gameQuestionId_teamId_key" ON "TeamAnswer"("gameQuestionId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "AnswerOption_gameQuestionId_order_key" ON "AnswerOption"("gameQuestionId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_gameQuestionId_teamId_key" ON "Vote"("gameQuestionId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "PhaseCaptain_gameId_teamId_phase_key" ON "PhaseCaptain"("gameId", "teamId", "phase");

-- AddForeignKey
ALTER TABLE "TemplateQuestion" ADD CONSTRAINT "TemplateQuestion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "GameTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "GameTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameQuestion" ADD CONSTRAINT "GameQuestion_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameQuestion" ADD CONSTRAINT "GameQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamAnswer" ADD CONSTRAINT "TeamAnswer_gameQuestionId_fkey" FOREIGN KEY ("gameQuestionId") REFERENCES "GameQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamAnswer" ADD CONSTRAINT "TeamAnswer_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamAnswer" ADD CONSTRAINT "TeamAnswer_captainUserId_fkey" FOREIGN KEY ("captainUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnswerOption" ADD CONSTRAINT "AnswerOption_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnswerOption" ADD CONSTRAINT "AnswerOption_gameQuestionId_fkey" FOREIGN KEY ("gameQuestionId") REFERENCES "GameQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_gameQuestionId_fkey" FOREIGN KEY ("gameQuestionId") REFERENCES "GameQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_captainUserId_fkey" FOREIGN KEY ("captainUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhaseCaptain" ADD CONSTRAINT "PhaseCaptain_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhaseCaptain" ADD CONSTRAINT "PhaseCaptain_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhaseCaptain" ADD CONSTRAINT "PhaseCaptain_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreEvent" ADD CONSTRAINT "ScoreEvent_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreEvent" ADD CONSTRAINT "ScoreEvent_gameQuestionId_fkey" FOREIGN KEY ("gameQuestionId") REFERENCES "GameQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreEvent" ADD CONSTRAINT "ScoreEvent_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

