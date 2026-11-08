import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canAccessClient, isStaff } from "@/lib/access";
import { denyClosed } from "@/lib/gate";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user || !isStaff(user)) {
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }
  const closed = await denyClosed(user, request);
  if (closed) return closed;

  const form = await request.formData();
  const clientId = String(form.get("clientId") ?? "").trim();
  const title = String(form.get("title") ?? "").trim();
  const cadence = String(form.get("cadence") ?? "weekly").trim();
  const intent = String(form.get("intent") ?? "create");
  const goalId = String(form.get("goalId") ?? "").trim();

  const access = await canAccessClient(user, clientId);
  if (!access.ok) {
    return NextResponse.redirect(new URL("/clients?error=Access%20denied", request.url), 303);
  }

  if (intent === "update_status" && goalId) {
    const status = String(form.get("status") ?? "active");
    await prisma.goal.update({
      where: { id: goalId },
      data: { status },
    });
    await prisma.auditEvent.create({
      data: {
        actorId: user.id,
        action: "GoalStatusUpdated",
        entity: "Goal",
        entityId: goalId,
        metadata: JSON.stringify({ status }),
      },
    });
    return NextResponse.redirect(new URL(`/clients/${clientId}`, request.url), 303);
  }

  if (!title) {
    return NextResponse.redirect(new URL(`/clients/${clientId}?error=Goal%20title%20required`, request.url), 303);
  }

  const goal = await prisma.goal.create({
    data: {
      clientId,
      title,
      cadence: cadence || "weekly",
      status: "active",
      interactive: true,
      remindAtHour: 20,
    },
  });

  await prisma.auditEvent.create({
    data: {
      actorId: user.id,
      action: "GoalCreated",
      entity: "Goal",
      entityId: goal.id,
      metadata: JSON.stringify({ title }),
    },
  });

  const referer = request.headers.get("referer") ?? "";
  const dest = referer.includes("/goals") ? "/goals" : `/clients/${clientId}`;
  return NextResponse.redirect(new URL(dest, request.url), 303);
}
