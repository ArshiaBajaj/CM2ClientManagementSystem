import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { coachGate } from "@/lib/gate";

export function isStaff(user: SessionUser) {
  return user.role === "coach" || user.role === "team_lead" || user.role === "admin";
}

export function isLeadOrAdmin(user: SessionUser) {
  return user.role === "team_lead" || user.role === "admin";
}

export function isManager(user: SessionUser) {
  return isLeadOrAdmin(user);
}

/** Guardians/parents are emergency contacts — they never see the confidential student workspace. */
export function isParentViewer(user: SessionUser) {
  return user.role === "guardian";
}

export async function resolveCoachId(user: SessionUser) {
  if (user.coachId) return user.coachId;
  if (user.role !== "coach") return null;
  const roster = await prisma.coachRoster.findUnique({ where: { email: user.email } });
  return roster?.coachId ?? null;
}

export async function getGuardianHouseholdId(user: SessionUser) {
  if (user.role !== "guardian") return null;
  const guardian = await prisma.guardian.findFirst({ where: { email: user.email } });
  return guardian?.householdId ?? null;
}

export async function canAccessClient(user: SessionUser, clientId: string) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { assignments: true, household: { include: { guardians: true } } },
  });
  if (!client) return { ok: false as const, client: null };

  // A coach's private clients are theirs alone: managers and other coaches never see them.
  // The client themself and their family keep their normal access below.
  if (client.program === "private" && (isLeadOrAdmin(user) || user.role === "coach")) {
    if (user.role !== "coach") return { ok: false as const, client: null };
    if ((await coachGate(user)) !== "ready") return { ok: false as const, client: null };
    const coachId = await resolveCoachId(user);
    return coachId && client.ownerCoachId === coachId
      ? { ok: true as const, client }
      : { ok: false as const, client: null };
  }

  if (isLeadOrAdmin(user)) return { ok: true as const, client };

  if (user.role === "coach") {
    if ((await coachGate(user)) !== "ready") return { ok: false as const, client: null };
    const coachId = await resolveCoachId(user);
    const assigned = client.assignments.some(
      (a) => a.coachId === coachId && a.status === "active",
    );
    return assigned ? { ok: true as const, client } : { ok: false as const, client: null };
  }

  if (user.role === "guardian") {
    const allowed = client.household.guardians.some((g) => g.email === user.email);
    return allowed ? { ok: true as const, client } : { ok: false as const, client: null };
  }

  if (user.role === "client") {
    return user.clientId === clientId
      ? { ok: true as const, client }
      : { ok: false as const, client: null };
  }

  return { ok: false as const, client: null };
}

/** Staff-only and coach_only content stays hidden from parents/guardians. */
export function noteVisibleTo(user: SessionUser, visibility: string) {
  if (user.role === "guardian") return visibility === "parent_safe";
  if (visibility === "household" || visibility === "parent_safe") return true;
  return isStaff(user);
}

export function journalVisibleTo(user: SessionUser, visibility: string, authorRole: string) {
  if (user.role === "guardian") return false;
  if (visibility === "coach_only") return isStaff(user);
  if (visibility === "shared") return isStaff(user) || user.role === "client";
  if (visibility === "client_private") {
    return user.role === "client" || (isStaff(user) && authorRole === "client");
  }
  return isStaff(user);
}
