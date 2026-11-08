import { cookies } from "next/headers";
import type { Prisma } from "@prisma/client";
import type { SessionUser } from "@/lib/auth";

/**
 * Coaches can keep their own private clients next to their Coach Me 2 clients.
 *
 * - "cm2" clients belong to the program. Managers see them; coaches see the ones assigned to them.
 * - "private" clients belong to one coach (ownerCoachId). Only that coach ever sees them.
 *   Managers, other coaches, and program-wide lists never include them.
 *
 * A coach picks which caseload they are looking at with the switcher in the sidebar.
 */
export const CASELOAD_COOKIE = "cm2_caseload";
export type Caseload = "cm2" | "private" | "all";

export const CASELOAD_LABELS: Record<Caseload, string> = {
  cm2: "Coach Me 2 clients",
  private: "My own clients",
  all: "Everyone",
};

export function parseCaseload(value: string | undefined | null): Caseload {
  return value === "private" || value === "all" ? value : "cm2";
}

export async function getCaseload(user: SessionUser | null): Promise<Caseload> {
  if (!user || user.role !== "coach") return "cm2";
  const jar = await cookies();
  return parseCaseload(jar.get(CASELOAD_COOKIE)?.value);
}

function programFilter(caseload: Caseload): Prisma.ClientWhereInput {
  if (caseload === "all") return {};
  return { program: caseload };
}

/**
 * The clients a staff member may list. Combine with other filters (archived, ids) with spread.
 * Managers only ever see Coach Me 2 clients. Coaches see their assigned clients in the chosen caseload.
 */
export async function clientScope(user: SessionUser, coachId: string | null): Promise<Prisma.ClientWhereInput> {
  if (user.role === "coach") {
    if (!coachId) return { id: "__none__" };
    const caseload = await getCaseload(user);
    return { assignments: { some: { coachId, status: "active" } }, ...programFilter(caseload) };
  }
  return { program: "cm2" };
}

/** Same rule for appointment lists. */
export async function appointmentScope(
  user: SessionUser,
  coachId: string | null,
): Promise<Prisma.AppointmentWhereInput> {
  if (user.role === "coach") {
    if (!coachId) return { id: "__none__" };
    const caseload = await getCaseload(user);
    return { coachId, client: programFilter(caseload) };
  }
  return { client: { program: "cm2" } };
}

/** Same rule for chat conversation lists. */
export async function conversationScope(
  user: SessionUser,
  coachId: string | null,
): Promise<Prisma.ConversationWhereInput> {
  if (user.role === "coach") {
    if (!coachId) return { id: "__none__" };
    const caseload = await getCaseload(user);
    return { coachId, client: programFilter(caseload) };
  }
  return { client: { program: "cm2" } };
}
