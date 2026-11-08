import { prisma } from "@/lib/db";
import { isCoachStatusType, type CoachStatusEvent } from "@/contracts/coach-status";
import { hashPassword } from "@/lib/password";

export async function ingestCoachStatus(event: CoachStatusEvent) {
  if (!isCoachStatusType(event.eventType)) {
    throw new Error("Unsupported coach status event");
  }

  const existing = await prisma.coachRoster.findUnique({
    where: { sourceEventId: event.eventId },
  });
  if (existing) {
    return existing;
  }

  const roster = await prisma.coachRoster.upsert({
    where: { coachId: event.coachId },
    update: {
      email: event.email.toLowerCase(),
      name: event.name,
      status: event.status,
      programRoles: JSON.stringify(event.programRoles),
      effectiveAt: new Date(event.effectiveAt),
      expiresAt: event.expiresAt ? new Date(event.expiresAt) : null,
      sourceEventId: event.eventId,
    },
    create: {
      coachId: event.coachId,
      email: event.email.toLowerCase(),
      name: event.name,
      status: event.status,
      programRoles: JSON.stringify(event.programRoles),
      effectiveAt: new Date(event.effectiveAt),
      expiresAt: event.expiresAt ? new Date(event.expiresAt) : null,
      sourceEventId: event.eventId,
    },
  });

  const user = await prisma.user.findUnique({ where: { email: event.email.toLowerCase() } });
  if (!user) {
    await prisma.user.create({
      data: {
        email: event.email.toLowerCase(),
        name: event.name,
        password: hashPassword("demo1234"),
        role: "coach",
        coachId: event.coachId,
        mustChangePassword: true,
      },
    });
  } else if (!user.coachId) {
    await prisma.user.update({
      where: { id: user.id },
      data: { coachId: event.coachId, role: user.role === "admin" ? user.role : "coach" },
    });
  }

  if (event.status !== "active") {
    const activeAssignments = await prisma.assignment.findMany({
      where: { coachId: event.coachId, status: "active" },
    });

    for (const assignment of activeAssignments) {
      await prisma.assignment.update({
        where: { id: assignment.id },
        data: { status: "ended" },
      });
      await prisma.auditEvent.create({
        data: {
          action: "AssignmentEnded",
          entity: "Assignment",
          entityId: assignment.id,
          metadata: JSON.stringify({
            reason: event.status,
            coachId: event.coachId,
            clientId: assignment.clientId,
            sourceEventId: event.eventId,
          }),
        },
      });
    }
  }

  await prisma.auditEvent.create({
    data: {
      action: event.eventType,
      entity: "CoachRoster",
      entityId: event.coachId,
      metadata: JSON.stringify({ email: event.email, status: event.status }),
    },
  });

  return roster;
}
