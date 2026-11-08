import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canAccessClient, isStaff } from "@/lib/access";
import { denyClosed } from "@/lib/gate";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }
  const closed = await denyClosed(user, request);
  if (closed) return closed;

  const form = await request.formData();
  const clientId = String(form.get("clientId") ?? "").trim();
  const body = String(form.get("body") ?? "").trim();
  const visibilityRaw = String(form.get("visibility") ?? "coach_only");
  const visibility =
    visibilityRaw === "household" || visibilityRaw === "parent_safe"
      ? "parent_safe"
      : "coach_only";
  const returnTo = String(form.get("returnTo") ?? "").trim();
  const fallback = isStaff(user) ? `/clients/${clientId}` : "/workspace";
  const safeReturn =
    returnTo === "/workspace" || returnTo.startsWith(`/clients/${clientId}`)
      ? returnTo
      : fallback;

  const access = await canAccessClient(user, clientId);
  if (!access.ok) {
    return NextResponse.redirect(new URL("/workspace?error=Access%20denied", request.url), 303);
  }

  if (!isStaff(user) && user.role !== "guardian") {
    return NextResponse.redirect(
      new URL(`${safeReturn}?error=${encodeURIComponent("Not allowed to add notes")}`, request.url),
      303,
    );
  }

  if (!isStaff(user) && visibility !== "parent_safe") {
    return NextResponse.redirect(
      new URL(
        `${safeReturn}?error=${encodeURIComponent("Guardians can only add parent-safe notes")}`,
        request.url,
      ),
      303,
    );
  }

  if (!body) {
    return NextResponse.redirect(
      new URL(`${safeReturn}?error=${encodeURIComponent("Note cannot be empty")}`, request.url),
      303,
    );
  }

  const note = await prisma.note.create({
    data: {
      clientId,
      authorId: user.id,
      authorName: user.name,
      body,
      visibility: user.role === "guardian" ? "parent_safe" : visibility,
    },
  });

  await prisma.auditEvent.create({
    data: {
      actorId: user.id,
      action: "NoteCreated",
      entity: "Note",
      entityId: note.id,
      metadata: JSON.stringify({ visibility: note.visibility }),
    },
  });

  const done = user.role === "guardian" ? "Message sent to the coach" : "Note saved";
  return NextResponse.redirect(
    new URL(`${safeReturn}${safeReturn.includes("?") ? "&" : "?"}notice=${encodeURIComponent(done)}`, request.url),
    303,
  );
}
