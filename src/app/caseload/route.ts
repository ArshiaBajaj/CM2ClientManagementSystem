import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { CASELOAD_COOKIE, parseCaseload } from "@/lib/caseload";

/** The sidebar switcher: a coach chooses Coach Me 2 clients, their own clients, or everyone. */
export async function GET(request: NextRequest) {
  const user = await getSession();
  const next = request.nextUrl.searchParams.get("next") ?? "/workspace";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/workspace";
  const response = NextResponse.redirect(new URL(safeNext, request.url), 303);
  if (user?.role === "coach") {
    const caseload = parseCaseload(request.nextUrl.searchParams.get("set"));
    response.cookies.set(CASELOAD_COOKIE, caseload, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
  }
  return response;
}
