import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canAccessClient, isStaff } from "@/lib/access";
import { prisma } from "@/lib/db";

const ENGAGEMENT = ["engaged", "somewhat", "not_yet"];

/** Parent-safe progress updates: parents request one, the coach sends a short rating and goal list. */
export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 303);

  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  const clientId = String(form.get("clientId") ?? "");
  const access = await canAccessClient(user, clientId);
  if (!access.ok || !access.client) {
    return NextResponse.redirect(new URL("/workspace?error=Access%20denied", request.url), 303);
  }

  const go = (path: string, key: string, message: string) =>
    NextResponse.redirect(new URL(`${path}?${key}=${encodeURIComponent(message)}`, request.url), 303);

  if (intent === "request") {
    if (user.role !== "guardian") return go("/workspace", "error", "Only parents request updates");
    const open = await prisma.progressReport.findFirst({ where: { clientId, status: "requested" } });
    if (open) return go("/workspace", "notice", "You already have a request open. The coach will reply soon.");
    await prisma.progressReport.create({ data: { clientId, requestedById: user.id } });
    return go("/workspace", "notice", "Progress update requested from the coach");
  }

  if (intent === "send") {
    if (!isStaff(user)) return go("/workspace", "error", "Only coaches send updates");
    const engagement = String(form.get("engagement") ?? "");
    const progress = Number(form.get("progress") ?? 0);
    const focusAreas = String(form.get("focusAreas") ?? "").trim().slice(0, 600);
    const summary = String(form.get("summary") ?? "").trim().slice(0, 600);
    const back = `/clients/${clientId}`;
    if (!ENGAGEMENT.includes(engagement)) return go(back, "error", "Choose an engagement level");
    if (!(progress >= 1 && progress <= 5)) return go(back, "error", "Rate progress from 1 to 5");
    if (!focusAreas) return go(back, "error", "List what the student is working on");

    const data = {
      engagement,
      progress,
      focusAreas,
      summary,
      coachName: user.name,
      status: "sent",
      sentAt: new Date(),
    };
    const requestId = String(form.get("reportId") ?? "");
    const existing = requestId
      ? await prisma.progressReport.findFirst({ where: { id: requestId, clientId, status: "requested" } })
      : null;
    if (existing) await prisma.progressReport.update({ where: { id: existing.id }, data });
    else await prisma.progressReport.create({ data: { clientId, ...data } });

    const guardians = await prisma.guardian.findMany({ where: { householdId: access.client.householdId } });
    for (const guardian of guardians) {
      await prisma.emailLog.create({
        data: {
          toEmail: guardian.email,
          subject: `Progress update for ${access.client.firstName}`,
          body: `A new progress update from ${user.name} is ready in your Coach Me 2 family portal.`,
          status: "queued_local",
        },
      });
    }
    return go(back, "notice", "Progress update sent to the parent");
  }

  return go("/workspace", "error", "Unknown action");
}
