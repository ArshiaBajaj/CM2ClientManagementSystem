import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { audit, loginLocked } from "@/lib/security";
import { PENDING_COOKIE, loginError, readPendingSignIn, startSession } from "@/lib/sign-in";
import { checkTotp, openSecret } from "@/lib/totp";
import { NextResponse } from "next/server";

/** Second step of sign-in: checks the 6-digit code from the person's authenticator app. */
export async function POST(request: NextRequest) {
  const pending = await readPendingSignIn(request.cookies.get(PENDING_COOKIE)?.value);
  if (!pending) return loginError(request, "That took too long. Please sign in again.");
  const user = await prisma.user.findUnique({ where: { id: pending.userId } });
  if (!user || !user.totpSecret || !user.totpEnabledAt) return loginError(request, "Please sign in again.");
  if (await loginLocked(user.email)) {
    return loginError(request, "Too many attempts. Wait 15 minutes and try again.");
  }

  const form = await request.formData();
  const step = checkTotp(openSecret(user.totpSecret), String(form.get("code") ?? ""), user.totpLastStep);
  if (step === null) {
    await audit("LoginFailed", "User", user.email, user.id, { reason: "two_step_code" });
    return NextResponse.redirect(new URL("/login/verify?error=That%20code%20didn%27t%20work.%20Try%20the%20newest%20one.", request.url), 303);
  }
  await prisma.user.update({ where: { id: user.id }, data: { totpLastStep: step } });
  const response = await startSession(request, user, pending.method);
  response.cookies.delete(PENDING_COOKIE);
  return response;
}
