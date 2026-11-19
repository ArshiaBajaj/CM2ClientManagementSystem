import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/security";
import { checkTotp, newTotpSecret, openSecret, sealSecret } from "@/lib/totp";

function back(request: NextRequest, key: "notice" | "error", message: string) {
  return NextResponse.redirect(new URL(`/account/security?${key}=${encodeURIComponent(message)}`, request.url), 303);
}

/** Start, confirm, or turn off two-step sign-in for the signed-in person. */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.redirect(new URL("/login", request.url), 303);
  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 303);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  const code = String(form.get("code") ?? "");

  if (intent === "start") {
    if (user.totpEnabledAt) return back(request, "notice", "Two-step sign-in is already on");
    await prisma.user.update({ where: { id: user.id }, data: { totpSecret: sealSecret(newTotpSecret()), totpLastStep: 0 } });
    return back(request, "notice", "Scan the code with your authenticator app, then type the 6-digit code to finish");
  }

  if (intent === "confirm") {
    if (!user.totpSecret || user.totpEnabledAt) return back(request, "error", "Start setup first");
    const step = checkTotp(openSecret(user.totpSecret), code, 0);
    if (step === null) return back(request, "error", "That code didn't work. Check your phone's time and try the newest code.");
    await prisma.user.update({
      where: { id: user.id },
      data: { totpEnabledAt: new Date(), totpLastStep: step, sessionVersion: { increment: 1 } },
    });
    await audit("TwoStepEnabled", "User", user.id, user.id);
    return NextResponse.redirect(new URL("/login?error=Two-step%20sign-in%20is%20on.%20Please%20sign%20in%20again.", request.url), 303);
  }

  if (intent === "disable") {
    if (!user.totpSecret || !user.totpEnabledAt) return back(request, "notice", "Two-step sign-in is already off");
    const step = checkTotp(openSecret(user.totpSecret), code, user.totpLastStep);
    if (step === null) return back(request, "error", "Type a current code from your app to turn it off");
    await prisma.user.update({ where: { id: user.id }, data: { totpSecret: null, totpEnabledAt: null, totpLastStep: 0 } });
    await audit("TwoStepDisabled", "User", user.id, user.id);
    return back(request, "notice", "Two-step sign-in is off");
  }

  return back(request, "error", "Unknown action");
}
