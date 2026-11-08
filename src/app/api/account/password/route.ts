import { NextRequest, NextResponse } from "next/server";
import { createSession, getSession } from "@/lib/auth";
import { homeFor } from "@/lib/gate";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";

function back(request: NextRequest, message: string) {
  return NextResponse.redirect(
    new URL(`/account/password?error=${encodeURIComponent(message)}`, request.url),
    303,
  );
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.redirect(new URL("/login", request.url), 303);

  const form = await request.formData();
  const current = String(form.get("currentPassword") ?? "");
  const next = String(form.get("newPassword") ?? "");
  const confirm = String(form.get("confirmPassword") ?? "");

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 303);

  if (!verifyPassword(current, user.password)) return back(request, "Current password is incorrect");
  if (next.length < 8) return back(request, "New password must be at least 8 characters");
  if (next !== confirm) return back(request, "New passwords don't match");
  if (next === current) return back(request, "Choose a password different from the temporary one");

  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashPassword(next), mustChangePassword: false },
  });

  const nextSession = { ...session, mustChangePassword: false };
  await createSession(nextSession);

  const dest = await homeFor(nextSession);
  const url = new URL(dest, request.url);
  url.searchParams.set("notice", "Password updated");
  return NextResponse.redirect(url, 303);
}
