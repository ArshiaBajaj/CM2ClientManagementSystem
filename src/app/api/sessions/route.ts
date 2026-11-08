import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canAccessClient, isStaff } from "@/lib/access";
import { prisma } from "@/lib/db";

function clientError(request: NextRequest, clientId: string, message: string) {
  return NextResponse.redirect(
    new URL(`/clients/${clientId}?error=${encodeURIComponent(message)}`, request.url),
    303,
  );
}

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user || !isStaff(user)) {
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }

  const form = await request.formData();
  const assignmentId = String(form.get("assignmentId") ?? "").trim();
  const clientId = String(form.get("clientId") ?? "").trim();
  const summary = String(form.get("summary") ?? "").trim();
  const minutes = Number(form.get("minutes") ?? 45);
  const occurredAtRaw = String(form.get("occurredAt") ?? "");
  const occurredAt = occurredAtRaw ? new Date(occurredAtRaw) : new Date();

  const access = await canAccessClient(user, clientId);
  if (!access.ok) {
    return NextResponse.redirect(new URL("/clients?error=Access%20denied", request.url), 303);
  }

  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: { sessionAllowance: true, coach: true },
  });

  if (!assignment || assignment.clientId !== clientId || assignment.status !== "active") {
    return clientError(request, clientId, "Active assignment required");
  }

  if (assignment.coach.status !== "active") {
    return clientError(request, clientId, "Coach is not active");
  }

  if (!summary) {
    return clientError(request, clientId, "Session summary required");
  }

  if (!Number.isFinite(minutes) || minutes < 15 || minutes > 180) {
    return clientError(request, clientId, "Minutes must be between 15 and 180");
  }

  if (Number.isNaN(occurredAt.getTime())) {
    return clientError(request, clientId, "Invalid session date");
  }

  if (!assignment.sessionAllowance) {
    return clientError(request, clientId, "Session allowance missing for this pairing");
  }

  if (assignment.sessionAllowance.remaining <= 0) {
    return clientError(
      request,
      clientId,
      "No sessions remaining. Ask a team lead to adjust the allowance.",
    );
  }

  const session = await prisma.sessionLog.create({
    data: {
      assignmentId,
      occurredAt,
      minutes,
      summary,
      createdById: user.id,
    },
  });

  const used = assignment.sessionAllowance.used + 1;
  const remaining = Math.max(0, assignment.sessionAllowance.allowed - used);
  await prisma.sessionAllowance.update({
    where: { assignmentId },
    data: { used, remaining },
  });

  await prisma.auditEvent.create({
    data: {
      actorId: user.id,
      action: "SessionLogged",
      entity: "SessionLog",
      entityId: session.id,
      metadata: JSON.stringify({ assignmentId, minutes, remaining }),
    },
  });

  return NextResponse.redirect(new URL(`/clients/${clientId}`, request.url), 303);
}
