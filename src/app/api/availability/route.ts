import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isLeadOrAdmin, resolveCoachId } from "@/lib/access";
import { denyClosed } from "@/lib/gate";
import { prisma } from "@/lib/db";

function back(request: NextRequest, coachId: string, key: "notice" | "error", message: string) {
  const url = new URL("/availability", request.url);
  url.searchParams.set("coachId", coachId);
  url.searchParams.set(key, message);
  return NextResponse.redirect(url, 303);
}

function toMinutes(value: string) {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 303);
  const closed = await denyClosed(user, request);
  if (closed) return closed;

  const form = await request.formData();
  const manager = isLeadOrAdmin(user);
  const ownCoachId = await resolveCoachId(user);
  const coachId = manager ? String(form.get("coachId") ?? "") : (ownCoachId ?? "");
  if (!coachId) return NextResponse.redirect(new URL("/workspace?error=Coaches%20only", request.url), 303);

  const coach = await prisma.coachRoster.findUnique({ where: { coachId } });
  if (!coach) return back(request, coachId, "error", "Coach not found");

  const intent = String(form.get("intent") ?? "");

  if (intent === "add_slot") {
    const days = form.getAll("weekday").map(Number).filter((d) => d >= 0 && d <= 6);
    const start = toMinutes(String(form.get("start") ?? ""));
    const end = toMinutes(String(form.get("end") ?? ""));
    if (days.length === 0) return back(request, coachId, "error", "Pick at least one day");
    if (start === null || end === null || end - start < 30) {
      return back(request, coachId, "error", "End time must be at least 30 minutes after the start");
    }
    const existing = await prisma.coachAvailability.findMany({ where: { coachId, weekday: { in: days } } });
    const clash = existing.find((s) => s.startMinute < end && s.endMinute > start);
    if (clash) return back(request, coachId, "error", "That overlaps hours you already posted");
    await prisma.coachAvailability.createMany({
      data: days.map((weekday) => ({ coachId, weekday, startMinute: start, endMinute: end })),
    });
    return back(request, coachId, "notice", "Availability added");
  }

  if (intent === "remove_slot") {
    await prisma.coachAvailability.deleteMany({
      where: { id: String(form.get("slotId") ?? ""), coachId },
    });
    return back(request, coachId, "notice", "Removed");
  }

  if (intent === "profile") {
    const focus = form.getAll("focusAreas").map(String).filter(Boolean);
    const capacity = Math.min(40, Math.max(1, Number(form.get("capacity") ?? coach.capacity) || coach.capacity));
    await prisma.coachRoster.update({
      where: { coachId },
      data: {
        focusAreas: focus.join(", "),
        capacity,
        timezone: String(form.get("timezone") ?? coach.timezone),
      },
    });
    return back(request, coachId, "notice", "Coaching profile saved");
  }

  return back(request, coachId, "error", "Unknown action");
}
