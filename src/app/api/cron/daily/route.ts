import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { notifyUsers } from "@/lib/push";

/**
 * Morning reminders, run once a day by Vercel Cron (see vercel.json):
 * students get today's session time or a nudge to check in on their goals, coaches get their session count,
 * managers get new coach requests and website messages.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authorized = secret
    ? request.headers.get("authorization") === `Bearer ${secret}`
    : (request.headers.get("user-agent") ?? "").includes("vercel-cron");
  if (!authorized) return NextResponse.json({ error: "Not allowed" }, { status: 401 });

  const now = new Date();
  const until = new Date(now.getTime() + 16 * 60 * 60 * 1000);
  const sent = { students: 0, coaches: 0, managers: 0 };

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
    await notifyUsers(
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
    await notifyUsers(
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
    await notifyUsers(
      coaches.map((u) => u.id),
      { title: "Today", body: `You have ${count} session${count === 1 ? "" : "s"} today.`, url: "/calendar", tag: "daily" },
    );
    sent.coaches += coaches.length;
  }

  // Managers: anything waiting from the website.
  const [requests, inquiries] = await Promise.all([
    prisma.coachRequest.count({ where: { status: "new" } }),
    prisma.siteInquiry.count({ where: { status: "new", kind: { not: "newsletter" } } }),
  ]);
  if (requests + inquiries > 0) {
    const managers = await prisma.user.findMany({ where: { role: { in: ["team_lead", "admin"] } }, select: { id: true } });
    const parts = [
      requests ? `${requests} coach request${requests === 1 ? "" : "s"}` : "",
      inquiries ? `${inquiries} website message${inquiries === 1 ? "" : "s"}` : "",
    ].filter(Boolean);
    await notifyUsers(
      managers.map((u) => u.id),
      { title: "Waiting for you", body: `${parts.join(" and ")}.`, url: "/workspace", tag: "daily" },
    );
    sent.managers += managers.length;
  }

  return NextResponse.json({ ok: true, sent });
}
