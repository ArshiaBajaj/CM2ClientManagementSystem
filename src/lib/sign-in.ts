import { NextRequest, NextResponse } from "next/server";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/db";
import { createSession, type SessionUser } from "@/lib/auth";
import { homeFor } from "@/lib/gate";
import { audit } from "@/lib/security";

export const PENDING_COOKIE = "cm2_two_step";

function pendingKey() {
  return new TextEncoder().encode(`${process.env.AUTH_SECRET || "local-development-only-secret-not-for-production"}:two-step`);
}

/** Who is halfway through signing in (password or Google done, code still needed). */
export async function readPendingSignIn(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, pendingKey());
    return { userId: String(payload.uid), method: payload.method === "google" ? ("google" as const) : ("password" as const) };
  } catch {
    return null;
  }
}

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

  // Two-step sign-in: hold the session until the 6-digit code is checked on /login/verify.
  if (user.totpEnabledAt && user.totpSecret) {
    const pending = await new SignJWT({ uid: user.id, method })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(pendingKey());
    const response = NextResponse.redirect(new URL("/login/verify", request.url), 303);
    response.cookies.set(PENDING_COOKIE, pending, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 300,
    });
    return response;
  }
  return startSession(request, user, method);
}

/** Starts the session after every check has passed (including two-step sign-in, if it's on). */
export async function startSession(request: NextRequest, user: DbUser, method: "password" | "google") {
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
