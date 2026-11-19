import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isLeadOrAdmin } from "@/lib/access";
import { prisma } from "@/lib/db";
import { alertUsers } from "@/lib/alerts";
import { audit } from "@/lib/security";

/** Teens and parents report a safety concern; managers are alerted (no details in the alert) and resolve it. */
export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 303);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  const back = (path: string, key: string, message: string) =>
    NextResponse.redirect(new URL(`${path}${path.includes("?") ? "&" : "?"}${key}=${encodeURIComponent(message)}`, request.url), 303);

  if (intent === "report") {
    const body = String(form.get("body") ?? "").trim().slice(0, 4000);
    if (!body) return back("/workspace", "error", "Tell us what happened");
    const clientId = user.role === "client" ? user.clientId : String(form.get("clientId") ?? "") || null;
    const concern = await prisma.safetyConcern.create({
      data: { reporterId: user.id, reporterName: user.name, reporterRole: user.role, clientId, body },
    });
    await audit("SafetyConcernReported", "SafetyConcern", concern.id, user.id);
    const managers = await prisma.user.findMany({ where: { role: { in: ["admin", "team_lead"] } }, select: { id: true } });
    await alertUsers(managers.map((m) => m.id), {
      title: "Safety concern reported",
      body: "Someone reported a concern. Please review it in the portal today.",
      url: "/concerns",
      tag: `concern-${concern.id}`,
    });
    return back(request.headers.get("referer")?.replace(/^https?:\/\/[^/]+/, "").split("?")[0] || "/workspace", "notice", "Thank you. The program managers have been told and will follow up.");
  }

  if (intent === "resolve") {
    if (!isLeadOrAdmin(user)) return back("/workspace", "error", "Managers only");
    const id = String(form.get("id") ?? "");
    await prisma.safetyConcern.update({
      where: { id },
      data: { resolvedAt: new Date(), resolvedById: user.id, note: String(form.get("note") ?? "").slice(0, 2000) },
    });
    await audit("SafetyConcernResolved", "SafetyConcern", id, user.id);
    return back("/concerns", "notice", "Marked as handled");
  }

  return back("/workspace", "error", "Unknown action");
}
