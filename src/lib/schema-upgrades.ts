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
  // Website inbox
  `CREATE TABLE IF NOT EXISTS "SiteInquiry" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL,
    "topic" TEXT NOT NULL DEFAULT '',
    "message" TEXT NOT NULL DEFAULT '',
    "detailsJson" TEXT NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SiteInquiry_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "SiteInquiry_status_createdAt_idx" ON "SiteInquiry"("status", "createdAt")`,
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
];

export async function ensureSchema() {
  for (const statement of STATEMENTS) {
    await prisma.$executeRawUnsafe(statement);
  }
}
