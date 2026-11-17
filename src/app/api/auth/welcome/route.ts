import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashInvite } from "@/lib/invite";
import { hashPassword } from "@/lib/password";
import { audit } from "@/lib/security";
import { finishSignIn } from "@/lib/sign-in";

/** Sets a password from a welcome-email link (one use), then signs the person in. */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const token = String(form.get("t") ?? "");
  const next = String(form.get("newPassword") ?? "");
  const confirm = String(form.get("confirmPassword") ?? "");
  const back = (message: string) =>
    NextResponse.redirect(
      new URL(`/welcome?t=${encodeURIComponent(token)}&error=${encodeURIComponent(message)}`, request.url),
      303,
    );

  const user = token ? await prisma.user.findUnique({ where: { inviteTokenHash: hashInvite(token) } }) : null;
  if (!user || !user.inviteExpiresAt || user.inviteExpiresAt.getTime() < Date.now()) {
    return NextResponse.redirect(new URL("/welcome", request.url), 303);
  }
  if (next.length < 8) return back("Use at least 8 characters");
  if (next !== confirm) return back("The two passwords don't match");

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { password: hashPassword(next), mustChangePassword: false, inviteTokenHash: null, inviteExpiresAt: null },
  });
  await audit("WelcomeLinkUsed", "User", user.id, user.id);
  return finishSignIn(request, updated, "password");
}
