import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { calendarTokenFor } from "@/lib/calendar";

/** Creates or resets the signed-in person's private calendar link. */
export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 303);
  const form = await request.formData();
  await calendarTokenFor(user.id, String(form.get("intent") ?? "") === "reset");
  return NextResponse.redirect(new URL("/account/devices?notice=calendar", request.url), 303);
}
