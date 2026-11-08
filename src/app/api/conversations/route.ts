import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canAccessClient, isLeadOrAdmin, resolveCoachId } from "@/lib/access";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 303);

  const form = await request.formData();
  const intent = String(form.get("intent") ?? "").trim();
  const conversationId = String(form.get("conversationId") ?? "").trim();

  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation) {
    return NextResponse.redirect(new URL("/chat?error=Not%20found", request.url), 303);
  }

  const access = await canAccessClient(user, conversation.clientId);
  if (!access.ok && !isLeadOrAdmin(user)) {
    return NextResponse.redirect(new URL("/chat?error=Access%20denied", request.url), 303);
  }

  if (user.role === "coach") {
    const coachId = await resolveCoachId(user);
    if (conversation.coachId !== coachId) {
      return NextResponse.redirect(new URL("/chat?error=Access%20denied", request.url), 303);
    }
  }

  if (intent === "archive") {
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { status: "archived", archivedAt: new Date() },
    });
  } else if (intent === "reopen") {
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { status: "active", archivedAt: null },
    });
  }

  return NextResponse.redirect(new URL("/chat", request.url), 303);
}
