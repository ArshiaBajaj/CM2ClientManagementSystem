import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canAccessClient, isStaff, resolveCoachId } from "@/lib/access";
import { denyClosed } from "@/lib/gate";
import { prisma } from "@/lib/db";
import { notifyUsers } from "@/lib/push";

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 303);
  const closed = await denyClosed(user, request);
  if (closed) return closed;
  if (user.role === "guardian") {
    return NextResponse.redirect(
      new URL("/workspace?error=Parents%20cannot%20access%20student%20chat", request.url),
      303,
    );
  }

  const form = await request.formData();
  const conversationId = String(form.get("conversationId") ?? "").trim();
  const body = String(form.get("body") ?? "").trim();
  const clientId = String(form.get("clientId") ?? "").trim();
  const coachIdInput = String(form.get("coachId") ?? "").trim();

  if (!body) {
    return NextResponse.redirect(new URL("/chat?error=Message%20required", request.url), 303);
  }

  let conversation = conversationId
    ? await prisma.conversation.findUnique({ where: { id: conversationId } })
    : null;

  if (!conversation && clientId) {
    const access = await canAccessClient(user, clientId);
    if (!access.ok) {
      return NextResponse.redirect(new URL("/chat?error=Access%20denied", request.url), 303);
    }

    let coachId = coachIdInput;
    if (user.role === "coach") {
      coachId = (await resolveCoachId(user)) ?? "";
    } else if (user.role === "client") {
      const assignment = await prisma.assignment.findFirst({
        where: { clientId, status: "active" },
      });
      coachId = assignment?.coachId ?? "";
    }

    if (!coachId) {
      return NextResponse.redirect(new URL("/chat?error=No%20coach%20assigned", request.url), 303);
    }

    conversation = await prisma.conversation.upsert({
      where: { clientId_coachId: { clientId, coachId } },
      update: { status: "active", archivedAt: null },
      create: { clientId, coachId, status: "active" },
    });
  }

  if (!conversation) {
    return NextResponse.redirect(new URL("/chat?error=Conversation%20not%20found", request.url), 303);
  }

  if (conversation.status === "archived" || conversation.status === "closed") {
    return NextResponse.redirect(
      new URL(`/chat/${conversation.id}?error=Conversation%20is%20archived`, request.url),
      303,
    );
  }

  const access = await canAccessClient(user, conversation.clientId);
  // A coach's private clients are off limits to managers, even with a conversation link.
  const privateClient = access.client?.program === "private" ||
    (await prisma.client.findUnique({ where: { id: conversation.clientId }, select: { program: true } }))?.program === "private";
  if (privateClient && user.role !== "coach" && user.role !== "client") {
    return NextResponse.redirect(new URL("/chat?error=Access%20denied", request.url), 303);
  }
  if (!access.ok && !(isStaff(user) && user.role !== "coach")) {
    return NextResponse.redirect(new URL("/chat?error=Access%20denied", request.url), 303);
  }

  if (user.role === "coach") {
    const coachId = await resolveCoachId(user);
    if (conversation.coachId !== coachId) {
      return NextResponse.redirect(new URL("/chat?error=Access%20denied", request.url), 303);
    }
  }

  if (user.role === "client" && user.clientId !== conversation.clientId) {
    return NextResponse.redirect(new URL("/chat?error=Access%20denied", request.url), 303);
  }

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: user.id,
      senderName: user.name,
      senderRole: user.role,
      body,
    },
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: new Date() },
  });

  // Tell the other side (phone + Apple Watch). Only who wrote, never the message itself.
  if (user.role === "client") {
    const roster = await prisma.coachRoster.findUnique({ where: { coachId: conversation.coachId } });
    const coachUsers = await prisma.user.findMany({
      where: { OR: [{ coachId: conversation.coachId }, ...(roster ? [{ email: roster.email }] : [])] },
      select: { id: true },
    });
    await notifyUsers(
      coachUsers.map((u) => u.id),
      { title: "New message", body: `${user.name.split(" ")[0]} sent you a message.`, url: `/chat/${conversation.id}`, tag: `chat-${conversation.id}` },
    );
  } else {
    const students = await prisma.user.findMany({ where: { clientId: conversation.clientId, role: "client" }, select: { id: true } });
    await notifyUsers(
      students.map((u) => u.id),
      { title: "New message from your coach", body: `${user.name.split(" ")[0]} sent you a message.`, url: `/chat/${conversation.id}`, tag: `chat-${conversation.id}` },
    );
  }

  return NextResponse.redirect(new URL(`/chat/${conversation.id}`, request.url), 303);
}
