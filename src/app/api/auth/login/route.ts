import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { DEMO_EMAILS, audit, demoMode, loginLocked } from "@/lib/security";
import { finishSignIn, loginError } from "@/lib/sign-in";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").toLowerCase().trim();
  const password = String(form.get("password") ?? "");
  const fail = (message = "Invalid email or password") => loginError(request, message);
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

  return finishSignIn(request, user, "password");
}
