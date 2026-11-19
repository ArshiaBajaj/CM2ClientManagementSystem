import { prisma } from "@/lib/db";
import { emailReady, sendEmail, sendWelcome } from "@/lib/invite";

/**
 * Chasing people who were added but haven't finished setting up:
 * - never signed in → a fresh welcome link after 1, 3, and 7 days (then it stops)
 * - signed in but no phone notifications → one email explaining how to turn them on
 * Managers are never chased.
 */
const GAPS_DAYS = [1, 2, 4]; // days after the previous email: day 1, day 3, day 7
const DAY = 86_400_000;
const PEOPLE = ["intern", "client", "guardian", "coach"];

export async function remindNotSignedIn(origin: string, opts: { now?: Date; force?: boolean; role?: string } = {}) {
  if (!emailReady()) return [];
  const now = opts.now ?? new Date();
  const people = await prisma.user.findMany({
    where: {
      lastLoginAt: null,
      role: opts.role ? opts.role : { in: PEOPLE },
      inviteReminders: { lt: opts.force ? 100 : GAPS_DAYS.length },
    },
    select: { id: true, email: true, createdAt: true, inviteReminders: true, inviteReminderAt: true },
  });
  const sent: string[] = [];
  for (const p of people) {
    const since = (p.inviteReminderAt ?? p.createdAt).getTime();
    const due = opts.force || now.getTime() - since >= (GAPS_DAYS[p.inviteReminders] ?? Infinity) * DAY - 3_600_000;
    if (!due) continue;
    if (await sendWelcome(p.email, origin, "Coach Me 2", { reminder: true })) {
      await prisma.user.update({ where: { id: p.id }, data: { inviteReminders: { increment: 1 }, inviteReminderAt: now } });
      sent.push(p.email);
    }
  }
  return sent;
}

export async function promptPhoneNotifications(origin: string, now = new Date()) {
  if (!emailReady()) return [];
  const people = await prisma.user.findMany({
    where: { lastLoginAt: { not: null, lt: new Date(now.getTime() - 3_600_000) }, pushPromptAt: null, role: { in: PEOPLE } },
    select: { id: true, email: true, name: true },
  });
  const phones = new Set(
    (await prisma.pushSubscription.findMany({ where: { userId: { in: people.map((p) => p.id) } }, select: { userId: true } })).map(
      (s) => s.userId,
    ),
  );
  const sent: string[] = [];
  for (const p of people.filter((p) => !phones.has(p.id))) {
    const first = p.name.split(/\s+/)[0] || "there";
    const lines = [
      `Hi ${first},`,
      "",
      "Thanks for signing in to Coach Me 2! One more step so reminders reach you: turn on notifications on your phone.",
      "",
      `iPhone: open ${origin} in Safari, tap ⋯ (or the Share button) → Add to Home Screen → Add. Open Coach Me 2 from your Home Screen and tap "Turn on", then Allow.`,
      `Android: open ${origin} in Chrome, tap ⋮ → Add to home screen → Install. Open it and tap "Turn on", then Allow.`,
      "",
      `Step-by-step pictures: ${origin}/account/devices`,
    ];
    const ok = await sendEmail(p.email, "One more step: turn on Coach Me 2 notifications", lines.join("\n"));
    await prisma.user.update({ where: { id: p.id }, data: { pushPromptAt: now } });
    if (ok) sent.push(p.email);
  }
  return sent;
}

/** First names of interns who haven't signed in yet (for the Google Chat roundup). */
export async function internsNotSignedIn() {
  const users = await prisma.user.findMany({
    where: { role: "intern", lastLoginAt: null },
    select: { name: true },
    orderBy: { name: "asc" },
  });
  return users.map((u) => u.name.split(/\s+/)[0]).filter(Boolean);
}
