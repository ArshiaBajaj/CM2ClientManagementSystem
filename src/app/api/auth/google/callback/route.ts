import { timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { GOOGLE_STATE_COOKIE, googleEmailFromCode, googleEnabled, googleRedirectUri } from "@/lib/google";
import { DEMO_EMAILS, audit } from "@/lib/security";
import { finishSignIn, loginError } from "@/lib/sign-in";

function sameState(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length > 0 && x.length === y.length && timingSafeEqual(x, y);
}

/** Google sends the person back here. Only emails that already have a portal account get in. */
export async function GET(request: NextRequest) {
  if (!googleEnabled()) return loginError(request, "Google sign-in isn't set up yet.");
  const code = request.nextUrl.searchParams.get("code") ?? "";
  const state = request.nextUrl.searchParams.get("state") ?? "";
  const expected = request.cookies.get(GOOGLE_STATE_COOKIE)?.value ?? "";
  if (!code || !sameState(state, expected)) return loginError(request, "Google sign-in didn't finish. Try again.");

  const email = await googleEmailFromCode(code, googleRedirectUri(request.url));
  if (!email) return loginError(request, "Google sign-in didn't finish. Try again.");

  const user = DEMO_EMAILS.has(email) ? null : await prisma.user.findUnique({ where: { email } });
  if (!user) {
    await audit("LoginFailed", "User", email, null, { method: "google", reason: "no_account" });
    return loginError(request, `${email} doesn't have a Coach Me 2 account yet. Ask your program manager to add you.`);
  }

  const response = await finishSignIn(request, user, "google");
  response.cookies.delete({ name: GOOGLE_STATE_COOKIE, path: "/api/auth/google" });
  return response;
}
