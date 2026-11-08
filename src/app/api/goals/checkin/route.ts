import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canAccessClient } from "@/lib/access";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 303);

  const form = await request.formData();
  const goalId = String(form.get("goalId") ?? "").trim();
  const completed = String(form.get("completed") ?? "1") === "1";
  const note = String(form.get("note") ?? "").trim() || null;
  const day = String(form.get("day") ?? new Date().toISOString().slice(0, 10));

  const goal = await prisma.goal.findUnique({ where: { id: goalId } });
  if (!goal) {
    return NextResponse.redirect(new URL("/goals?error=Goal%20not%20found", request.url), 303);
  }

  const access = await canAccessClient(user, goal.clientId);
  if (!access.ok) {
    return NextResponse.redirect(new URL("/goals?error=Access%20denied", request.url), 303);
  }

  if (user.role === "guardian") {
    return NextResponse.redirect(
      new URL("/workspace?error=Parents%20cannot%20check%20in%20on%20student%20goals", request.url),
      303,
    );
  }

  await prisma.goalCheckIn.upsert({
    where: { goalId_day: { goalId, day } },
    update: { completed, note },
    create: {
      goalId,
      clientId: goal.clientId,
      day,
      completed,
      note,
    },
  });

  return NextResponse.redirect(new URL("/goals", request.url), 303);
}
