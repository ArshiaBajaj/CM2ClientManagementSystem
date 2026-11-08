import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canAccessClient, resolveCoachId } from "@/lib/access";
import { prisma } from "@/lib/db";

/** Opens (or starts) the chat thread between a student and their coach. */
export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));
  if (user.role === "guardian") return NextResponse.redirect(new URL("/workspace", request.url));

  const clientId = request.nextUrl.searchParams.get("clientId") ?? user.clientId ?? "";
  const access = await canAccessClient(user, clientId);
  if (!access.ok || !access.client) return NextResponse.redirect(new URL("/chat?error=Access%20denied", request.url));

  const coachId =
    user.role === "coach"
      ? await resolveCoachId(user)
      : access.client.assignments.find((a) => a.status === "active")?.coachId;
  if (!coachId) return NextResponse.redirect(new URL("/chat?error=This%20student%20has%20no%20coach%20yet", request.url));

  const conversation = await prisma.conversation.upsert({
    where: { clientId_coachId: { clientId, coachId } },
    update: { status: "active", archivedAt: null },
    create: { clientId, coachId },
  });
  return NextResponse.redirect(new URL(`/chat/${conversation.id}`, request.url));
}
