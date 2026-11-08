import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isLeadOrAdmin } from "@/lib/access";
import { prisma } from "@/lib/db";

function matchingError(request: NextRequest, message: string) {
  return NextResponse.redirect(
    new URL(`/matching?error=${encodeURIComponent(message)}`, request.url),
    303,
  );
}

async function endAssignment(assignmentId: string, actorId: string, reason: string) {
  const assignment = await prisma.assignment.update({
    where: { id: assignmentId },
    data: { status: "ended" },
  });

  await prisma.auditEvent.create({
    data: {
      actorId,
      action: "AssignmentEnded",
      entity: "Assignment",
      entityId: assignment.id,
      metadata: JSON.stringify({ reason, coachId: assignment.coachId, clientId: assignment.clientId }),
    },
  });

  return assignment;
}

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user || !isLeadOrAdmin(user)) {
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }

  const form = await request.formData();
  const intent = String(form.get("intent") ?? "create").trim();

  if (intent === "end") {
    const assignmentId = String(form.get("assignmentId") ?? "").trim();
    if (!assignmentId) return matchingError(request, "Missing pairing");

    const existing = await prisma.assignment.findUnique({ where: { id: assignmentId } });
    if (!existing || existing.status !== "active") {
      return matchingError(request, "Active pairing not found");
    }

    await endAssignment(assignmentId, user.id, "manual");
    return NextResponse.redirect(new URL("/matching", request.url), 303);
  }

  if (intent === "adjust_allowance") {
    const assignmentId = String(form.get("assignmentId") ?? "").trim();
    const allowed = Number(form.get("allowed") ?? 0);
    if (!assignmentId) return matchingError(request, "Missing pairing");
    if (!Number.isFinite(allowed) || allowed < 1 || allowed > 52) {
      return matchingError(request, "Allowance must be between 1 and 52");
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { sessionAllowance: true },
    });
    if (!assignment || assignment.status !== "active" || !assignment.sessionAllowance) {
      return matchingError(request, "Active pairing with allowance required");
    }

    const used = assignment.sessionAllowance.used;
    if (allowed < used) {
      return matchingError(request, `Allowance cannot be below sessions already used (${used})`);
    }

    await prisma.sessionAllowance.update({
      where: { assignmentId },
      data: { allowed, remaining: allowed - used },
    });

    await prisma.auditEvent.create({
      data: {
        actorId: user.id,
        action: "AllowanceAdjusted",
        entity: "SessionAllowance",
        entityId: assignment.sessionAllowance.id,
        metadata: JSON.stringify({ assignmentId, allowed, used }),
      },
    });

    return NextResponse.redirect(new URL("/matching", request.url), 303);
  }

  const coachId = String(form.get("coachId") ?? "").trim();
  const clientId = String(form.get("clientId") ?? "").trim();
  const allowed = Number(form.get("allowed") ?? 12);
  const replaceExisting = String(form.get("replaceExisting") ?? "") === "1";

  if (!coachId || !clientId) {
    return matchingError(request, "Missing coach or client");
  }

  const coach = await prisma.coachRoster.findUnique({ where: { coachId } });
  if (!coach || coach.status !== "active") {
    return matchingError(request, "Coach must be active");
  }

  if (coach.expiresAt && coach.expiresAt.getTime() < Date.now()) {
    return matchingError(request, "Coach roster entry has expired");
  }

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) {
    return matchingError(request, "Client not found");
  }

  const samePairing = await prisma.assignment.findFirst({
    where: { coachId, clientId, status: "active" },
  });
  if (samePairing) {
    return matchingError(request, "Pairing already active");
  }

  const otherActive = await prisma.assignment.findMany({
    where: { clientId, status: "active" },
  });

  if (otherActive.length > 0 && !replaceExisting) {
    return matchingError(
      request,
      "Client already has an active coach. End that pairing or check Replace existing.",
    );
  }

  for (const prior of otherActive) {
    await endAssignment(prior.id, user.id, "replaced");
  }

  const sessionCap = Number.isFinite(allowed) && allowed > 0 && allowed <= 52 ? allowed : 12;

  const assignment = await prisma.assignment.create({
    data: { coachId, clientId, status: "active" },
  });

  await prisma.sessionAllowance.create({
    data: {
      assignmentId: assignment.id,
      allowed: sessionCap,
      used: 0,
      remaining: sessionCap,
    },
  });

  await prisma.auditEvent.create({
    data: {
      actorId: user.id,
      action: "AssignmentCreated",
      entity: "Assignment",
      entityId: assignment.id,
      metadata: JSON.stringify({ coachId, clientId, replaced: otherActive.map((a) => a.id) }),
    },
  });

  if (String(form.get("returnTo") ?? "") === "/matching") {
    return NextResponse.redirect(
      new URL(`/matching?notice=${encodeURIComponent(`${client.firstName} is now paired with ${coach.name}`)}`, request.url),
      303,
    );
  }
  return NextResponse.redirect(new URL(`/clients/${clientId}`, request.url), 303);
}
