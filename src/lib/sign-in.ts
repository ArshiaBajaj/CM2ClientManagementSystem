import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession, type SessionUser } from "@/lib/auth";
import { homeFor } from "@/lib/gate";
import { audit } from "@/lib/security";

type DbUser = NonNullable<Awaited<ReturnType<typeof prisma.user.findUnique>>>;

export function loginError(request: NextRequest, message: string) {
  return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(message)}`, request.url), 303);
}

/** Shared by password and Google sign-in: checks coach access, starts the session, and sends the person home. */
export async function finishSignIn(request: NextRequest, user: DbUser, method: "password" | "google") {
  if (user.role === "coach") {
    const roster = await prisma.coachRoster.findFirst({
      where: { OR: [{ email: user.email }, { coachId: user.coachId ?? "" }] },
    });
    if (!roster || roster.status !== "active") return loginError(request, "Coach is not activated in onboarding");
    if (roster.expiresAt && roster.expiresAt.getTime() < Date.now()) {
      return loginError(request, "Coach roster access has expired");
    }
  }

  const now = new Date();
  // Someone who signs in with Google never needs the temporary password they were given.
  const mustChangePassword = method === "google" ? false : user.mustChangePassword;
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: now, mustChangePassword } });
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
    mustChangePassword,
  };
  await audit("LoginSucceeded", "User", user.id, user.id, { method });
  await createSession(session);
  return NextResponse.redirect(new URL(await homeFor(session), request.url), 303);
}
