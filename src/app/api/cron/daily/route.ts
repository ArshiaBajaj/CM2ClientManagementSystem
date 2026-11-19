import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/security";
import { alertUsers, postToGoogleChat } from "@/lib/alerts";
import { dueLabel, isOverdue, localParts } from "@/lib/commitments";
import { internsNotSignedIn, promptPhoneNotifications, remindNotSignedIn } from "@/lib/follow-ups";
import { httpsUrl } from "@/lib/public-url";
import { onTeamWhere } from "@/lib/gate";

export const maxDuration = 60;

/** YYYY-MM-DD in the program's time zone, `days` from now. */
function dayKey(days = 0) {
  const t = localParts(new Date(Date.now() + days * 86_400_000));
  return `${t.year}-${String(t.month).padStart(2, "0")}-${String(t.day).padStart(2, "0")}`;
}

/**
 * Morning reminders, run once a day by Vercel Cron (see vercel.json):
 * students get today's session time or a nudge to check in on their goals, coaches get their session count,
 * managers get new coach requests.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authorized = secret
    ? request.headers.get("authorization") === `Bearer ${secret}`
    : (request.headers.get("user-agent") ?? "").includes("vercel-cron");
  if (!authorized) return NextResponse.json({ error: "Not allowed" }, { status: 401 });

  // Runs at most once every 20 hours, so calling it again (or a forged call) can't spam anyone.
  const recent = await prisma.auditEvent.findFirst({
    where: { action: "CronDailyRan", createdAt: { gt: new Date(Date.now() - 20 * 3_600_000) } },
  });
  if (recent) return NextResponse.json({ ok: true, skipped: "already ran today" });
  await audit("CronDailyRan", "Program", "daily", null);

  const now = new Date();
  const until = new Date(now.getTime() + 16 * 60 * 60 * 1000);
  const sent = { students: 0, coaches: 0, managers: 0, interns: 0 };

  const sessions = await prisma.appointment.findMany({
    where: { status: "scheduled", startsAt: { gte: now, lt: until } },
    include: { client: true, coach: true },
    orderBy: { startsAt: "asc" },
  });

  // Students with a session today.
  const withSession = new Set<string>();
  for (const s of sessions) {
    if (withSession.has(s.clientId)) continue;
    withSession.add(s.clientId);
    const students = await prisma.user.findMany({ where: { clientId: s.clientId, role: "client" }, select: { id: true } });
    const time = s.startsAt.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: s.client.timezone || "America/New_York",
    });
    await alertUsers(
      students.map((u) => u.id),
      { title: "Session today", body: `With ${s.coach.name} at ${time}.`, url: "/calendar", tag: "daily" },
    );
    sent.students += students.length;
  }

  // Students with active goals and no session today: a gentle check-in nudge.
  const goalClients = await prisma.goal.findMany({
    where: { status: "active", interactive: true, clientId: { notIn: [...withSession] } },
    select: { clientId: true },
    distinct: ["clientId"],
  });
  if (goalClients.length > 0) {
    const students = await prisma.user.findMany({
      where: { role: "client", clientId: { in: goalClients.map((g) => g.clientId) } },
      select: { id: true },
    });
    await alertUsers(
      students.map((u) => u.id),
      { title: "Today's goals", body: "Take ten seconds to check in on your goals.", url: "/goals", tag: "daily" },
    );
    sent.students += students.length;
  }

  // Coaches: how many sessions today.
  const perCoach = new Map<string, { email: string; count: number }>();
  for (const s of sessions) {
    const entry = perCoach.get(s.coachId) ?? { email: s.coach.email, count: 0 };
    entry.count += 1;
    perCoach.set(s.coachId, entry);
  }
  for (const [coachId, { email, count }] of perCoach) {
    const coaches = await prisma.user.findMany({ where: { OR: [{ coachId }, { email }] }, select: { id: true } });
    await alertUsers(
      coaches.map((u) => u.id),
      { title: "Today", body: `You have ${count} session${count === 1 ? "" : "s"} today.`, url: "/calendar", tag: "daily" },
    );
    sent.coaches += coaches.length;
  }

  // Managers: new coach requests waiting for a match.
  const requests = await prisma.coachRequest.count({ where: { status: "new" } });
  if (requests > 0) {
    const managers = await prisma.user.findMany({ where: { role: { in: ["team_lead", "admin"] } }, select: { id: true } });
    await alertUsers(
      managers.map((u) => u.id),
      { title: "Waiting for you", body: `${requests} new coach request${requests === 1 ? "" : "s"}.`, url: "/matching", tag: "daily" },
    );
    sent.managers += managers.length;
  }

  // Interns: "Hey, this is pending." What they promised, and board tasks with dates, due today, tomorrow, or late.
  const today = dayKey(0);
  const tomorrow = dayKey(1);
  const endTomorrow = new Date(now.getTime() + 48 * 3_600_000);
  const [commitments, tasks, interns] = await Promise.all([
    prisma.internCommitment.findMany({
      where: { status: "open", dueAt: { lt: endTomorrow } },
      include: { intern: { include: { team: true } } },
      orderBy: { dueAt: "asc" },
    }),
    prisma.internTask.findMany({ where: { status: { not: "done" }, dueOn: { not: "", lte: tomorrow }, assigneeId: { not: null } } }),
    prisma.intern.findMany({ where: { status: "active" }, include: { user: { select: { id: true } } } }),
  ]);
  const chatLines: string[] = [];
  for (const intern of interns) {
    if (!intern.user) continue;
    const lines: string[] = [];
    for (const c of commitments.filter((c) => c.internId === intern.id)) {
      const key = dueLabel(c.dueAt, now);
      if (isOverdue(c, now)) {
        lines.push(`Overdue: ${c.what} (was due ${key}). Finish it or move the date so your team knows.`);
        chatLines.push(`⚠️ ${intern.firstName}: ${c.what} (was due ${key})`);
      } else {
        lines.push(`Due ${key}: ${c.what}`);
        if (key.startsWith("today")) chatLines.push(`📌 ${intern.firstName}: ${c.what} (due ${key})`);
      }
    }
    for (const t of tasks.filter((t) => t.assigneeId === intern.id)) {
      lines.push(`${t.dueOn < today ? "Overdue task" : t.dueOn === today ? "Task due today" : "Task due tomorrow"}: ${t.title}`);
    }
    if (lines.length === 0) continue;
    await alertUsers(
      [intern.user.id],
      {
        title: "Hey, this is pending",
        body: lines.length === 1 ? lines[0] : `${lines.length} things need you: ${lines[0]}`,
        url: "/intern/commitments",
        tag: "daily-intern",
      },
      { lines },
    );
    sent.interns += 1;
  }
  if (commitments.length) {
    await prisma.internCommitment.updateMany({
      where: { id: { in: commitments.map((c) => c.id) } },
      data: { remindedAt: now },
    });
  }
  // Chase anyone who hasn't signed in (fresh link on day 1, 3, 7), and nudge signed-in people to turn on notifications.
  const origin = httpsUrl(process.env.APP_URL) ?? "https://cm2-workspace.vercel.app";
  const reInvited = await remindNotSignedIn(origin);
  const phonePrompted = await promptPhoneNotifications(origin);

  // Optional: the same roundup in the program's Google Chat space (first names only, never client information).
  const waiting = await internsNotSignedIn();
  const chatParts = [
    chatLines.length ? `*Today's commitments*\n${chatLines.join("\n")}` : "",
    waiting.length ? `*Not signed in to the intern workspace yet:* ${waiting.join(", ")}. It takes 2 minutes: ${origin}` : "",
  ].filter(Boolean);
  const chatPosted = chatParts.length
    ? await postToGoogleChat(`${chatParts.join("\n\n")}\n\nUpdate yours: ${origin}/intern/commitments`)
    : false;

  // Each team with its own Google Chat space gets its own roundup.
  const chatTeams = await prisma.internTeam.findMany({ where: { chatWebhook: { not: "" } } });
  let teamPosts = 0;
  for (const team of chatTeams) {
    const members = await prisma.intern.findMany({ where: onTeamWhere(team.id), include: { user: true } });
    const lines: string[] = [];
    for (const c of commitments.filter((c) => (c.teamId ?? c.intern.teamId) === team.id)) {
      const key = dueLabel(c.dueAt, now);
      if (isOverdue(c, now)) lines.push(`⚠️ ${c.intern.firstName}: ${c.what} (was due ${key})`);
      else if (key.startsWith("today")) lines.push(`📌 ${c.intern.firstName}: ${c.what} (due ${key})`);
      else lines.push(`🗓️ ${c.intern.firstName}: ${c.what} (due ${key})`);
    }
    const notIn = members.filter((i) => i.user && !i.user.lastLoginAt).map((i) => i.firstName);
    const parts = [
      lines.length ? `*${team.name}: today's commitments*\n${lines.join("\n")}` : "",
      notIn.length ? `*Not signed in yet:* ${notIn.join(", ")}. It takes 2 minutes: ${origin}` : "",
    ].filter(Boolean);
    if (parts.length && (await postToGoogleChat(`${parts.join("\n\n")}\n\nUpdate yours: ${origin}/intern/commitments`, team.chatWebhook))) {
      teamPosts += 1;
    }
  }

  return NextResponse.json({ ok: true, sent, reInvited: reInvited.length, phonePrompted: phonePrompted.length, chatPosted, teamPosts });
}
