import { prisma } from "@/lib/db";

/**
 * Adds the tables and columns newer features need, if they're missing. Runs once when the server starts
 * (src/instrumentation.ts), over the app's normal database connection.
 *
 * Every statement only ADDS (IF NOT EXISTS), so it's safe to run again and never touches existing data.
 * Names match what `prisma db push` would create, so the two stay in sync.
 */
const STATEMENTS = [
  // Coaches' private clients
  `ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "program" TEXT NOT NULL DEFAULT 'cm2'`,
  `ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "ownerCoachId" TEXT`,
  // Intern direct messages
  `ALTER TABLE "InternChannel" ADD COLUMN IF NOT EXISTS "memberIds" TEXT NOT NULL DEFAULT ''`,
  // Calendar feed
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "calendarToken" TEXT`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "User_calendarToken_key" ON "User"("calendarToken")`,
  // Phone and Apple Watch notifications
  `ALTER TABLE "ProgramSettings" ADD COLUMN IF NOT EXISTS "vapidPublicKey" TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE "ProgramSettings" ADD COLUMN IF NOT EXISTS "vapidPrivateKey" TEXT NOT NULL DEFAULT ''`,
  `CREATE TABLE IF NOT EXISTS "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint")`,
  `CREATE INDEX IF NOT EXISTS "PushSubscription_userId_idx" ON "PushSubscription"("userId")`,
  // Welcome emails
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "inviteTokenHash" TEXT`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "inviteExpiresAt" TIMESTAMP(3)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "User_inviteTokenHash_key" ON "User"("inviteTokenHash")`,
  // Email reminders and intern commitments
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailNotifications" BOOLEAN NOT NULL DEFAULT true`,
  `ALTER TABLE "ProgramSettings" ADD COLUMN IF NOT EXISTS "googleChatWebhook" TEXT NOT NULL DEFAULT ''`,
  `CREATE TABLE IF NOT EXISTS "InternCommitment" (
    "id" TEXT NOT NULL,
    "internId" TEXT NOT NULL,
    "teamId" TEXT,
    "what" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "source" TEXT NOT NULL DEFAULT 'form',
    "channelName" TEXT NOT NULL DEFAULT '',
    "messageId" TEXT,
    "createdById" TEXT NOT NULL,
    "doneAt" TIMESTAMP(3),
    "timesMoved" INTEGER NOT NULL DEFAULT 0,
    "remindedAt" TIMESTAMP(3),
    "overdueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InternCommitment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "InternCommitment_internId_fkey" FOREIGN KEY ("internId") REFERENCES "Intern"("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "InternCommitment_internId_status_idx" ON "InternCommitment"("internId", "status")`,
  `CREATE INDEX IF NOT EXISTS "InternCommitment_status_dueAt_idx" ON "InternCommitment"("status", "dueAt")`,
  // Sign-in and notification follow-ups
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "inviteReminders" INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "inviteReminderAt" TIMESTAMP(3)`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pushPromptAt" TIMESTAMP(3)`,
  // World View
  `ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "country" TEXT`,
  `ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "worldOptIn" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "worldInterests" TEXT NOT NULL DEFAULT ''`,
  `CREATE TABLE IF NOT EXISTS "WorldCircle" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'proposed',
    "coachId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorldCircle_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "WorldCircleMember" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorldCircleMember_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "WorldCircleMember_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "WorldCircle"("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "WorldCircleMember_circleId_clientId_key" ON "WorldCircleMember"("circleId", "clientId")`,
  `CREATE INDEX IF NOT EXISTS "WorldCircleMember_clientId_idx" ON "WorldCircleMember"("clientId")`,
  `CREATE TABLE IF NOT EXISTS "WorldCircleMessage" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "senderRole" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorldCircleMessage_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "WorldCircleMessage_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "WorldCircle"("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "WorldCircleMessage_circleId_createdAt_idx" ON "WorldCircleMessage"("circleId", "createdAt")`,
];

export async function ensureSchema() {
  for (const statement of STATEMENTS) {
    await prisma.$executeRawUnsafe(statement);
  }
}
