import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** Turns email reminders on or off for the signed-in person. */
export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 303);
  const form = await request.formData();
  const on = String(form.get("email") ?? "") === "on";
  await prisma.user.update({ where: { id: user.id }, data: { emailNotifications: on } });
  return NextResponse.redirect(new URL("/account/devices", request.url), 303);
}
