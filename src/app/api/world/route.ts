import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getGuardianHouseholdId, isLeadOrAdmin } from "@/lib/access";
import { prisma } from "@/lib/db";
import { notifyUsers } from "@/lib/push";
import { audit } from "@/lib/security";
import { COUNTRIES, WORLD_CONSENT, WORLD_INTERESTS, circleAccess, proposeCircles } from "@/lib/world";

function back(request: NextRequest, key: "notice" | "error", message: string, circle?: string) {
  const url = new URL("/world", request.url);
  url.searchParams.set(key, message);
  if (circle) url.searchParams.set("circle", circle);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 303);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  const text = (k: string, max = 200) => String(form.get(k) ?? "").trim().slice(0, max);

  // Teen: country + interests + opt in/out
  if (intent === "profile") {
    if (user.role !== "client" || !user.clientId) return back(request, "error", "Only students can join circles");
    const client = await prisma.client.findUnique({ where: { id: user.clientId } });
    if (!client || client.program !== "cm2") return back(request, "error", "World View is for Coach Me 2 students");
    const country = text("country");
    if (country && !COUNTRIES.includes(country)) return back(request, "error", "Pick a country from the list");
    const interests = form
      .getAll("interests")
      .map(String)
      .filter((i) => (WORLD_INTERESTS as readonly string[]).includes(i))
      .slice(0, 3);
    const optIn = text("optIn") === "1";
    if (optIn && (!country || interests.length === 0)) {
      return back(request, "error", "Add your country and at least one interest to join a circle");
    }
    await prisma.client.update({
      where: { id: client.id },
      data: { country: country || null, worldInterests: interests.join("|"), worldOptIn: optIn },
    });
    return back(request, "notice", optIn ? "You're on the list. We'll match you once a parent says yes." : "Saved");
  }

  // Parent/guardian: allow or withdraw permission for a teen in their household
  if (intent === "consent") {
    if (user.role !== "guardian") return back(request, "error", "Only a parent or guardian can give permission");
    const householdId = await getGuardianHouseholdId(user);
    const client = await prisma.client.findFirst({ where: { id: text("clientId"), householdId: householdId ?? "__none__" } });
    if (!client) return back(request, "error", "That student isn't in your family");
    if (text("allow") === "1") {
      await prisma.consent.create({ data: { clientId: client.id, kind: WORLD_CONSENT, version: "2026.11", grantedBy: user.email } });
      await audit("WorldConsentGranted", "Client", client.id, user.id);
      return back(request, "notice", `${client.firstName} can be matched into a moderated circle.`);
    }
    await prisma.consent.deleteMany({ where: { clientId: client.id, kind: WORLD_CONSENT } });
    await prisma.client.update({ where: { id: client.id }, data: { worldOptIn: false } });
    await prisma.worldCircleMember.deleteMany({ where: { clientId: client.id } });
    await audit("WorldConsentWithdrawn", "Client", client.id, user.id);
    return back(request, "notice", `Permission withdrawn. ${client.firstName} has left any circles.`);
  }

  // Anyone with access: post in a circle
  if (intent === "message") {
    const circleId = text("circleId", 60);
    const circle = await circleAccess(user, circleId);
    if (!circle || circle.status !== "active") return back(request, "error", "That circle isn't open to you");
    const body = text("body", 1000);
    if (!body) return back(request, "error", "Write a message first", circleId);
    const firstName = user.name.split(" ")[0];
    await prisma.worldCircleMessage.create({
      data: { circleId, senderId: user.id, senderName: user.role === "client" ? firstName : `${firstName} (coach)`, senderRole: user.role, body },
    });
    const teens = await prisma.user.findMany({
      where: { role: "client", clientId: { in: circle.members.map((m) => m.clientId) }, id: { not: user.id } },
      select: { id: true },
    });
    await notifyUsers(
      teens.map((t) => t.id),
      { title: "World View", body: `New message in ${circle.theme}.`, url: `/world?circle=${circleId}`, tag: `circle-${circleId}` },
    );
    return back(request, "notice", "Sent", circleId);
  }

  // Managers: propose, start, and close circles
  if (!isLeadOrAdmin(user)) return back(request, "error", "Only program leads can manage circles");

  if (intent === "propose") {
    const made = await proposeCircles();
    return back(request, "notice", made.length ? `${made.length} circle${made.length === 1 ? "" : "s"} proposed` : "No new circles yet: not enough teens with a parent's yes");
  }

  if (intent === "start") {
    const circleId = text("circleId", 60);
    const coachId = text("coachId", 60);
    const coach = await prisma.coachRoster.findFirst({ where: { coachId, status: "active" } });
    if (!coach) return back(request, "error", "Pick an active coach to moderate");
    const circle = await prisma.worldCircle.update({
      where: { id: circleId },
      data: { status: "active", coachId },
      include: { members: true },
    });
    await audit("WorldCircleStarted", "WorldCircle", circle.id, user.id, { coachId });
    const teens = await prisma.user.findMany({
      where: { role: "client", clientId: { in: circle.members.map((m) => m.clientId) } },
      select: { id: true },
    });
    await notifyUsers(
      teens.map((t) => t.id),
      { title: "Your World View circle is open", body: `Meet teens from other countries who care about ${circle.theme.toLowerCase()}.`, url: `/world?circle=${circle.id}` },
    );
    return back(request, "notice", "Circle is open", circle.id);
  }

  if (intent === "close") {
    await prisma.worldCircle.update({ where: { id: text("circleId", 60) }, data: { status: "closed" } });
    return back(request, "notice", "Circle closed");
  }

  return back(request, "error", "Unknown action");
}
