import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isLeadOrAdmin } from "@/lib/access";
import { prisma } from "@/lib/db";

function back(request: NextRequest, key: string, message: string) {
  return NextResponse.redirect(new URL(`/updates?${key}=${encodeURIComponent(message)}`, request.url), 303);
}

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user || !isLeadOrAdmin(user)) return NextResponse.redirect(new URL("/login", request.url), 303);

  const form = await request.formData();
  const intent = String(form.get("intent") ?? "create");
  const id = String(form.get("id") ?? "");

  if (intent === "toggle") {
    const update = await prisma.programUpdate.findUnique({ where: { id } });
    if (!update) return back(request, "error", "Update not found");
    await prisma.programUpdate.update({ where: { id }, data: { published: !update.published } });
    return back(request, "notice", update.published ? "Hidden from the website" : "Published");
  }

  if (intent === "delete") {
    await prisma.programUpdate.deleteMany({ where: { id } });
    return back(request, "notice", "Deleted");
  }

  const kind = String(form.get("kind") ?? "news");
  const title = String(form.get("title") ?? "").trim();
  const summary = String(form.get("summary") ?? "").trim();
  const url = String(form.get("url") ?? "").trim();
  if (!title) return back(request, "error", "Add a title");
  if (url && !/^https?:\/\//.test(url)) return back(request, "error", "Links must start with http:// or https://");

  await prisma.programUpdate.create({
    data: { kind: ["podcast", "research", "news"].includes(kind) ? kind : "news", title, summary, url },
  });
  return back(request, "notice", "Published to the website feed");
}
