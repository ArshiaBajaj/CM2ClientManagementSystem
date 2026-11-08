import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isLeadOrAdmin } from "@/lib/access";
import { prisma } from "@/lib/db";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INQUIRY_KINDS = ["contact", "intern_application", "newsletter"] as const;
const RETURN_PATHS = new Set(["/contact", "/volunteer", "/"]);

function wantsJson(request: NextRequest) {
  return (request.headers.get("accept") ?? "").includes("application/json");
}

function reply(request: NextRequest, returnTo: string, ok: boolean, message?: string) {
  if (wantsJson(request)) return NextResponse.json({ ok, message }, { status: ok ? 200 : 400 });
  const url = new URL(returnTo, request.url);
  url.searchParams.set(ok ? "sent" : "error", ok ? "1" : (message ?? "Something went wrong"));
  return NextResponse.redirect(url, 303);
}

/**
 * Website forms (contact, intern applications, quiz sign-ups) land here and show up for managers
 * in the workspace under Website inbox. Managers also use this route to mark messages handled.
 */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const text = (key: string, max = 2000) => String(form.get(key) ?? "").trim().slice(0, max);

  if (text("intent") === "status") {
    const user = await getSession();
    if (!user || !isLeadOrAdmin(user)) return NextResponse.redirect(new URL("/login", request.url), 303);
    const status = text("status") === "new" ? "new" : "handled";
    await prisma.siteInquiry.updateMany({ where: { id: text("id") }, data: { status } });
    return NextResponse.redirect(new URL(`/inbox${text("view") ? `?view=${text("view")}` : ""}`, request.url), 303);
  }

  const returnTo = RETURN_PATHS.has(text("returnTo")) ? text("returnTo") : "/contact";

  // Bots fill the hidden field; pretend it worked.
  if (text("website")) return reply(request, returnTo, true);

  const kind = (INQUIRY_KINDS as readonly string[]).includes(text("kind")) ? text("kind") : "contact";
  const email = text("email", 200).toLowerCase();
  const name = text("name", 120);
  const message = text("message", 4000);
  if (!EMAIL.test(email)) return reply(request, returnTo, false, "Please add a valid email address");
  if (kind !== "newsletter" && !name) return reply(request, returnTo, false, "Please add your name");
  if (kind === "contact" && !message) return reply(request, returnTo, false, "Please write a short message");

  const recent = await prisma.siteInquiry.count({
    where: { email, createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  });
  if (recent >= 5) return reply(request, returnTo, false, "We already have a few notes from you today. We'll be in touch.");

  let details: Record<string, string> = {};
  try {
    const parsed = JSON.parse(text("details", 4000) || "{}") as Record<string, unknown>;
    details = Object.fromEntries(Object.entries(parsed).map(([k, v]) => [k.slice(0, 40), String(v ?? "").slice(0, 400)]));
  } catch {
    details = {};
  }
  for (const key of ["school", "year", "lane"]) {
    if (text(key)) details[key] = text(key, 200);
  }

  await prisma.siteInquiry.create({
    data: {
      kind,
      name,
      email,
      topic: text("topic", 120),
      message,
      detailsJson: JSON.stringify(details),
    },
  });

  return reply(request, returnTo, true);
}
