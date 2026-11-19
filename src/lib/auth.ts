import { cache } from "react";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/db";

export const COOKIE_NAME = "cm2_client_session";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "coach" | "team_lead" | "client" | "guardian" | "admin" | "intern" | "intern_parent";
  coachId?: string | null;
  clientId?: string | null;
  internId?: string | null;
  mustChangePassword?: boolean;
};

function secret() {
  const value = process.env.AUTH_SECRET;
  // Never sign sessions with a guessable key on a real deployment.
  if (!value || value.length < 32) {
    if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET must be set (32+ characters)");
    return new TextEncoder().encode("local-development-only-secret-not-for-production");
  }
  return new TextEncoder().encode(value);
}

export async function createSession(user: SessionUser) {
  // Stamp the account's current session version; bumping it later signs out this session everywhere.
  const record = await prisma.user.findUnique({ where: { id: user.id }, select: { sessionVersion: true } });
  const token = await new SignJWT({ ...user, sv: record?.sessionVersion ?? 0 })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret());

  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

/**
 * The signed-in person, or null. Also checks the account still exists and hasn't been signed out everywhere
 * (password or role changed), and always uses the account's current role and links.
 */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;

  let payload: SessionUser & { sv?: number };
  try {
    payload = (await jwtVerify(token, secret())).payload as SessionUser & { sv?: number };
  } catch {
    return null;
  }
  const account = await prisma.user.findUnique({
    where: { id: payload.id },
    select: { sessionVersion: true, role: true, email: true, name: true, coachId: true, clientId: true, internId: true },
  });
  if (!account || account.sessionVersion !== (payload.sv ?? 0)) return null;
  return {
    ...payload,
    role: account.role as SessionUser["role"],
    email: account.email,
    name: account.name,
    coachId: account.coachId,
    clientId: account.clientId,
    internId: account.internId,
  };
});

/** Signs this person out on every device (call after a password or role change). */
export async function endOtherSessions(userId: string) {
  await prisma.user.update({ where: { id: userId }, data: { sessionVersion: { increment: 1 } } });
}
