export const COACH_STATUS_EVENT_VERSION = "2026-09-12";

export const COACH_STATUS_TYPES = [
  "CoachActivated",
  "CoachSuspended",
  "CoachDischarged",
] as const;

export type CoachStatusType = (typeof COACH_STATUS_TYPES)[number];

export type CoachStatusEvent = {
  eventId: string;
  eventType: CoachStatusType;
  version: typeof COACH_STATUS_EVENT_VERSION;
  coachId: string;
  email: string;
  name: string;
  status: "active" | "suspended" | "discharged";
  programRoles: string[];
  effectiveAt: string;
  expiresAt: string | null;
};

export function isCoachStatusType(value: string): value is CoachStatusType {
  return COACH_STATUS_TYPES.includes(value as CoachStatusType);
}
