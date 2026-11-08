import { NextRequest, NextResponse } from "next/server";
import { calendarFeed } from "@/lib/calendar";

/** Subscribed calendar feed (webcal). The token in the link is the only key, so keep links private. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const clean = token.replace(/\.ics$/, "");
  const feed = clean.length >= 20 ? await calendarFeed(clean, new URL(request.url).origin) : null;
  if (!feed) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(feed, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="coachme2.ics"',
      "Cache-Control": "private, max-age=300",
    },
  });
}
