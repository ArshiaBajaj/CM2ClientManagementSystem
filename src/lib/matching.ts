import { prisma } from "@/lib/db";

export const TIME_WINDOWS = [
  { key: "weekday_after_school", label: "Weekdays 3–6 pm", days: [1, 2, 3, 4, 5], start: 15 * 60, end: 18 * 60 },
  { key: "weekday_evening", label: "Weekdays 6–9 pm", days: [1, 2, 3, 4, 5], start: 18 * 60, end: 21 * 60 },
  { key: "weekend_morning", label: "Weekends 9 am–12 pm", days: [0, 6], start: 9 * 60, end: 12 * 60 },
  { key: "weekend_afternoon", label: "Weekends 12–5 pm", days: [0, 6], start: 12 * 60, end: 17 * 60 },
] as const;

export const FOCUS_AREAS = [
  "college planning",
  "academics",
  "stress and balance",
  "confidence",
  "leadership",
  "career exploration",
  "relationships",
  "athletics",
  "arts",
] as const;

export function splitList(raw: string) {
  return raw
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export type CoachSuggestion = {
  coachId: string;
  name: string;
  email: string;
  score: number;
  activeClients: number;
  capacity: number;
  sharedFocus: string[];
  matchingWindows: string[];
  reasons: string[];
};

/** Ranks active coaches by schedule overlap, shared focus areas, and open capacity. */
export async function suggestCoaches(input: {
  interests: string;
  preferredTimes: string;
  excludeCoachIds?: string[];
  limit?: number;
}): Promise<CoachSuggestion[]> {
  const coaches = await prisma.coachRoster.findMany({
    where: { status: "active", coachId: { notIn: input.excludeCoachIds ?? [] } },
    include: {
      availability: true,
      assignments: { where: { status: "active" } },
    },
  });

  const wanted = new Set(splitList(input.preferredTimes));
  const windows = TIME_WINDOWS.filter((w) => wanted.size === 0 || wanted.has(w.key));
  const interests = splitList(input.interests);

  const ranked = coaches
    .filter((coach) => !coach.expiresAt || coach.expiresAt.getTime() > Date.now())
    .map((coach) => {
      const matchingWindows = windows
        .filter((window) =>
          coach.availability.some(
            (slot) =>
              (window.days as readonly number[]).includes(slot.weekday) &&
              Math.min(slot.endMinute, window.end) - Math.max(slot.startMinute, window.start) >= 45,
          ),
        )
        .map((window) => window.label);

      const focus = splitList(coach.focusAreas);
      const sharedFocus = interests.filter((interest) =>
        focus.some((area) => area.includes(interest) || interest.includes(area)),
      );

      const activeClients = coach.assignments.length;
      const openRatio = Math.max(0, coach.capacity - activeClients) / Math.max(1, coach.capacity);
      const scheduleFit =
        coach.availability.length === 0 ? 0.25 : matchingWindows.length / Math.max(1, windows.length);
      const focusFit = interests.length === 0 ? 0.5 : sharedFocus.length / interests.length;

      const score = Math.round(scheduleFit * 50 + focusFit * 30 + openRatio * 20);

      const reasons: string[] = [];
      if (coach.availability.length === 0) reasons.push("Has not posted availability yet");
      else if (matchingWindows.length > 0) reasons.push(`Free ${matchingWindows.join(", ")}`);
      else reasons.push("No overlap with the requested times");
      if (sharedFocus.length > 0) reasons.push(`Coaches ${sharedFocus.join(", ")}`);
      if (activeClients >= coach.capacity) reasons.push("At capacity");
      else reasons.push(`${coach.capacity - activeClients} open spot${coach.capacity - activeClients === 1 ? "" : "s"}`);

      return {
        coachId: coach.coachId,
        name: coach.name,
        email: coach.email,
        score,
        activeClients,
        capacity: coach.capacity,
        sharedFocus,
        matchingWindows,
        reasons,
      };
    })
    .sort((a, b) => b.score - a.score || a.activeClients - b.activeClients);

  return ranked.slice(0, input.limit ?? 3);
}

export function minutesToLabel(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h >= 12 ? "pm" : "am";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour} ${suffix}` : `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** True when the coach has no posted hours, or the slot falls fully inside one of them. */
export async function withinCoachAvailability(coachId: string, startsAt: Date, endsAt: Date) {
  const slots = await prisma.coachAvailability.findMany({ where: { coachId } });
  if (slots.length === 0) return true;
  const weekday = startsAt.getDay();
  const start = startsAt.getHours() * 60 + startsAt.getMinutes();
  const end = start + Math.round((endsAt.getTime() - startsAt.getTime()) / 60000);
  return slots.some((slot) => slot.weekday === weekday && slot.startMinute <= start && slot.endMinute >= end);
}
