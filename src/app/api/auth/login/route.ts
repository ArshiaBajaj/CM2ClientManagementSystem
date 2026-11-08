import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession, type SessionUser } from "@/lib/auth";
import { homeFor } from "@/lib/gate";
import { verifyPassword } from "@/lib/password";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").toLowerCase().trim();
  const password = String(form.get("password") ?? "");
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !verifyPassword(password, user.password)) {
    return NextResponse.redirect(new URL("/login?error=Invalid%20email%20or%20password", request.url), 303);
  }

  if (user.role === "coach") {
    const roster = await prisma.coachRoster.findFirst({
      where: { OR: [{ email: user.email }, { coachId: user.coachId ?? "" }] },
    });
    if (!roster || roster.status !== "active") {
      return NextResponse.redirect(
        new URL("/login?error=Coach%20is%20not%20activated%20in%20onboarding", request.url),
        303,
      );
    }
    if (roster.expiresAt && roster.expiresAt.getTime() < Date.now()) {
      return NextResponse.redirect(
        new URL("/login?error=Coach%20roster%20access%20has%20expired", request.url),
        303,
      );
    }
  }

  const now = new Date();
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: now } });
  if (user.clientId) {
    await prisma.client.updateMany({ where: { id: user.clientId }, data: { lastActiveAt: now } });
  }

  const session: SessionUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as SessionUser["role"],
    coachId: user.coachId,
    clientId: user.clientId,
    internId: user.internId,
    mustChangePassword: user.mustChangePassword,
  };
  await createSession(session);
  return NextResponse.redirect(new URL(await homeFor(session), request.url), 303);
}
