import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

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
  const token = await new SignJWT(user)
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

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as SessionUser;
  } catch {
    return null;
  }
}
