import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession, type SessionUser } from "@/lib/auth";
import { homeFor } from "@/lib/gate";
import { verifyPassword } from "@/lib/password";
import { DEMO_EMAILS, audit, demoMode, loginLocked } from "@/lib/security";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").toLowerCase().trim();
  const password = String(form.get("password") ?? "");
  const fail = (message = "Invalid email or password") =>
    NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(message)}`, request.url), 303);
  if (!email || !password) return fail();

  if (await loginLocked(email)) {
    return fail("Too many attempts. Wait 15 minutes and try again, or ask your program lead to reset your password.");
  }

  // The preview accounts only open in demo mode, so their shared password can't open a live site.
  if (DEMO_EMAILS.has(email) && !demoMode()) {
    await audit("LoginFailed", "User", email, null, { reason: "demo_account_disabled" });
    return fail();
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !verifyPassword(password, user.password)) {
    await audit("LoginFailed", "User", email, user?.id ?? null);
    return fail();
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
  await audit("LoginSucceeded", "User", user.id, user.id);
  await createSession(session);
  return NextResponse.redirect(new URL(await homeFor(session), request.url), 303);
}
