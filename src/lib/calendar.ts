import { randomBytes } from "node:crypto";
import type { Prisma, User } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getGuardianHouseholdId, isLeadOrAdmin, resolveCoachId } from "@/lib/access";
import type { SessionUser } from "@/lib/auth";

/** A private, hard-to-guess link per person. Resetting it breaks any old subscription. */
export async function calendarTokenFor(userId: string, reset = false) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;
  if (user.calendarToken && !reset) return user.calendarToken;
  const token = randomBytes(24).toString("base64url");
  await prisma.user.update({ where: { id: userId }, data: { calendarToken: token } });
  return token;
}

function asSession(user: User): SessionUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as SessionUser["role"],
    coachId: user.coachId,
    clientId: user.clientId,
    internId: user.internId,
  };
}

/** Which sessions belong on this person's calendar. */
async function appointmentWhere(user: SessionUser): Promise<Prisma.AppointmentWhereInput | null> {
  if (user.role === "client") return user.clientId ? { clientId: user.clientId } : null;
  if (user.role === "guardian") {
    const householdId = await getGuardianHouseholdId(user);
    return householdId ? { client: { householdId } } : null;
  }
  if (user.role === "coach") {
    const coachId = await resolveCoachId(user);
    return coachId ? { coachId } : null;
  }
  if (isLeadOrAdmin(user)) return { client: { program: "cm2" } };
  return null;
}

function stamp(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escape(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, (c) => `\\${c}`);
}

/** Lines longer than 75 bytes must be folded for calendar apps. */
function fold(line: string) {
  const out: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    out.push(rest.slice(0, 74));
    rest = ` ${rest.slice(74)}`;
  }
  out.push(rest);
  return out.join("\r\n");
}

export async function calendarFeed(token: string, origin: string) {
  const owner = await prisma.user.findUnique({ where: { calendarToken: token } });
  if (!owner) return null;
  const user = asSession(owner);
  const where = await appointmentWhere(user);

  const appointments = where
    ? await prisma.appointment.findMany({
        where: {
          ...where,
          status: { in: ["scheduled", "completed"] },
          startsAt: { gte: new Date(Date.now() - 30 * 86_400_000), lte: new Date(Date.now() + 180 * 86_400_000) },
        },
        include: { client: true, coach: true, appointmentType: true },
        orderBy: { startsAt: "asc" },
        take: 500,
      })
    : [];

  const staff = user.role === "coach" || isLeadOrAdmin(user);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Coach Me 2//Sessions//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Coach Me 2",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];
  for (const a of appointments) {
    // Staff see the student's first name; families see the coach. Nothing confidential goes in a calendar.
    const who = staff ? a.client.firstName : a.coach.name;
    const kind = a.appointmentType?.name ?? "Coaching session";
    const link = `${origin}/calendar/${a.id}`;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${a.id}@coachme2.world`,
      `DTSTAMP:${stamp(new Date())}`,
      `DTSTART:${stamp(a.startsAt)}`,
      `DTEND:${stamp(a.endsAt)}`,
      fold(`SUMMARY:${escape(`${kind} · ${who}`)}`),
      fold(`DESCRIPTION:${escape(`${a.meetingUrl ? `Join: ${a.meetingUrl}\n` : ""}Open in Coach Me 2: ${link}`)}`),
      fold(`URL:${a.meetingUrl ?? link}`),
      `STATUS:${a.status === "scheduled" ? "CONFIRMED" : "CONFIRMED"}`,
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      "DESCRIPTION:Coach Me 2 session in 15 minutes",
      "TRIGGER:-PT15M",
      "END:VALARM",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}
