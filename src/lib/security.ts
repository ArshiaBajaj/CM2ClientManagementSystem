import { randomInt } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

/** The seeded preview accounts. They only work while demo mode is on (DEMO_LOGINS=on). */
export const DEMO_EMAILS = new Set([
  "lead@coachme2.org",
  "admin@coachme2.org",
  "coach@example.com",
  "pending.coach@example.com",
  "guardian@example.com",
  "teen@example.com",
  "maya.chen@example.com",
  "leo.park@example.com",
  "priya.chen@example.com",
  "sam.park@example.com",
]);

export function demoMode() {
  return process.env.DEMO_LOGINS === "on";
}

/** A temporary password people can read aloud or type on a phone: no look-alike characters. */
export function temporaryPassword() {
  const letters = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const pick = (set: string, n: number) => Array.from({ length: n }, () => set[randomInt(set.length)]).join("");
  return `${pick(letters, 4)}-${pick(digits, 4)}-${pick(letters, 4)}`;
}

const FLASH_COOKIE = "cm2_flash";

/** Shows a one-time message (like a temporary password) on the next page without putting it in the URL. */
export async function setFlash(message: string) {
  const jar = await cookies();
  jar.set(FLASH_COOKIE, message, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 120,
  });
}

export async function readFlash() {
  const jar = await cookies();
  return jar.get(FLASH_COOKIE)?.value ?? null;
}

const MAX_FAILED = 5;
const WINDOW_MS = 15 * 60 * 1000;

/** Five wrong passwords for one email in 15 minutes locks that email for the rest of the window. */
export async function loginLocked(email: string) {
  const failures = await prisma.auditEvent.count({
    where: { action: "LoginFailed", entityId: email, createdAt: { gt: new Date(Date.now() - WINDOW_MS) } },
  });
  return failures >= MAX_FAILED;
}

export async function audit(action: string, entity: string, entityId: string, actorId: string | null, details: object = {}) {
  try {
    await prisma.auditEvent.create({
      data: { action, entity, entityId, actorId, metadata: JSON.stringify(details) },
    });
  } catch (error) {
    console.error("audit log failed", error);
  }
}
