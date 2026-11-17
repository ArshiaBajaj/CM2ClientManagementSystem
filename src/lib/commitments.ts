/**
 * Intern commitments: "I'll send the flyer by Wednesday" becomes a promise with a due date the team can see.
 * Detection runs here on the server with plain rules. No message text leaves the portal.
 */
export const PROGRAM_TZ = "America/New_York";

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const WEEKDAY_SHORT: Record<string, number> = { sun: 0, mon: 1, tue: 2, tues: 2, wed: 3, thu: 4, thur: 4, thurs: 4, fri: 5, sat: 6 };
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** Year, month (1-12), day, weekday of a moment in the program's time zone. */
export function localParts(date: Date, tz = PROGRAM_TZ) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      weekday: "short",
      hour: "numeric",
      minute: "numeric",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    weekday: WEEKDAY_SHORT[String(parts.weekday).toLowerCase().slice(0, 3)] ?? 0,
  };
}

/** The moment when the program's clock reads this date and time. */
export function zoned(year: number, month: number, day: number, hour: number, minute: number, tz = PROGRAM_TZ) {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const seen = localParts(new Date(guess), tz);
  const shown = Date.UTC(seen.year, seen.month - 1, seen.day, seen.hour, seen.minute);
  return new Date(guess - (shown - guess));
}

function addDays(base: { year: number; month: number; day: number }, days: number) {
  const d = new Date(Date.UTC(base.year, base.month - 1, base.day + days));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

type Day = { year: number; month: number; day: number };

const DAY_WORDS =
  "today|tonight|tmrw|tmr|tomorrow|eod|end of (?:the )?day|eow|end of (?:the )?week|this weekend|the weekend|next week|" +
  "(?:this |next )?(?:sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tues?|wed|thu(?:rs?)?|fri|sat)" +
  "|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.? \\d{1,2}(?:st|nd|rd|th)?|\\d{1,2}/\\d{1,2}(?:/\\d{2,4})?";
const DAY_RE = new RegExp(`(?:\\b(?:by|before|on|until|no later than|due|for)\\s+)?(?:the\\s+)?\\b(${DAY_WORDS})\\b`, "i");
const TIME_RE = /(?:\b(?:at|by|before)\s+)?\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)(?=\W|$)|(?:\b(?:at|by|before)\s+)?\b(noon|midnight)\b/i;

/** Turns "wednesday", "tmrw", "11/20", "nov 20", "end of week" into a calendar day. */
function resolveDay(phrase: string, now: Date): Day | null {
  const p = phrase.toLowerCase().replace(/\s+/g, " ").trim();
  const today = localParts(now);
  if (/^(today|tonight|eod|end of (the )?day)$/.test(p)) return today;
  if (/^(tmrw|tmr|tomorrow)$/.test(p)) return addDays(today, 1);
  if (/^(eow|end of (the )?week)$/.test(p)) return addDays(today, (5 - today.weekday + 7) % 7);
  if (/^(this weekend|the weekend)$/.test(p)) return addDays(today, (0 - today.weekday + 7) % 7 || 7);
  if (p === "next week") return addDays(today, ((1 - today.weekday + 7) % 7 || 7) + 4); // next Friday
  const weekday = p.match(/^(this |next )?([a-z]+)$/);
  if (weekday) {
    const name = weekday[2];
    const target = WEEKDAYS.indexOf(name) >= 0 ? WEEKDAYS.indexOf(name) : WEEKDAY_SHORT[name];
    if (target === undefined) return null;
    let ahead = (target - today.weekday + 7) % 7;
    if (weekday[1] === "next " && ahead < 7) ahead += ahead === 0 ? 7 : 7;
    return addDays(today, ahead);
  }
  const named = p.match(/^([a-z]+)\.? (\d{1,2})/);
  if (named) {
    const month = MONTHS.indexOf(named[1].slice(0, 3)) + 1;
    if (!month) return null;
    const day = Number(named[2]);
    const year = month < today.month - 1 ? today.year + 1 : today.year;
    return { year, month, day };
  }
  const slash = p.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (slash) {
    const month = Number(slash[1]);
    const day = Number(slash[2]);
    let year = slash[3] ? Number(slash[3]) : today.year;
    if (year < 100) year += 2000;
    if (!slash[3] && month < today.month - 1) year += 1;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return { year, month, day };
  }
  return null;
}

function resolveTime(m: RegExpMatchArray | null) {
  if (!m) return null;
  if (m[4]) return m[4].toLowerCase() === "noon" ? { hour: 12, minute: 0 } : { hour: 23, minute: 59 };
  let hour = Number(m[1]);
  const minute = Number(m[2] ?? 0);
  const pm = m[3].toLowerCase().startsWith("p");
  if (hour === 12) hour = pm ? 12 : 0;
  else if (pm) hour += 12;
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

const PROMISE =
  /\b(?:i'?ll|i will|i'?m going to|im going to|i am going to|i'?m gonna|im gonna|i can|i promise to|let me|i plan to|i should have|i'?ll have|i will have|i'?ll get|i will get)\b\s+(.+)/i;

export type Detected = { what: string; dueAt: Date; when: string };

/**
 * Finds a promise with a deadline in one chat message, or null.
 * "I'll finish the flyer by Wednesday" → { what: "Finish the flyer", due Wednesday 11:59 pm }.
 */
export function detectCommitment(text: string, now = new Date()): Detected | null {
  for (const sentence of text.split(/(?<=[.!?\n])\s+|\n+/)) {
    const promise = sentence.match(PROMISE);
    if (!promise) continue;
    let rest = promise[1];
    const dayMatch = rest.match(DAY_RE);
    const timeMatch = rest.match(TIME_RE);
    // A time alone only counts as a deadline when it says "by" or "before" ("by 5pm").
    if (!dayMatch && !(timeMatch && /^(by|before)\b/i.test(timeMatch[0]))) continue;

    let day: Day | null = dayMatch ? resolveDay(dayMatch[1], now) : localParts(now);
    if (!day) continue;
    const time = resolveTime(timeMatch);
    const tonight = dayMatch ? /tonight|eod|end of (the )?day/i.test(dayMatch[1]) : false;
    const at = time ?? (tonight ? { hour: 21, minute: 0 } : { hour: 23, minute: 59 });
    let dueAt = zoned(day.year, day.month, day.day, at.hour, at.minute);
    // "by 5pm" said at 6pm means tomorrow.
    if (!dayMatch && dueAt.getTime() < now.getTime()) {
      day = addDays(day, 1);
      dueAt = zoned(day.year, day.month, day.day, at.hour, at.minute);
    }
    if (dueAt.getTime() < now.getTime() - 60_000) continue;

    for (const m of [dayMatch, timeMatch]) if (m) rest = rest.replace(m[0], " ");
    let what = rest
      .replace(/\s+/g, " ")
      .replace(/\s+(?:by|before|on|at|until)\s*$/i, "")
      .replace(/^(?:try to|definitely|totally|def|probably)\s+/i, "")
      .replace(/^(?:have|get)\s+(.+?)\s+(?:done|finished|ready|in|up|out|sent)\b/i, "finish $1")
      .replace(/[\s,;:!.?-]+$/, "")
      .replace(/\s+(?:ok|okay|guys|y'all|everyone|team)$/i, "")
      .trim();
    if (what.split(" ").length < 2 || what.length > 200) continue;
    what = what.charAt(0).toUpperCase() + what.slice(1);
    return { what, dueAt, when: dueLabel(dueAt, now) };
  }
  return null;
}

/** "today 5:00 PM", "tomorrow", "Wed, Nov 19", in the program's time zone. */
export function dueLabel(dueAt: Date, now = new Date()) {
  const due = localParts(dueAt);
  const today = localParts(now);
  const tomorrow = addDays(today, 1);
  const sameDay = (a: Day, b: Day) => a.year === b.year && a.month === b.month && a.day === b.day;
  const endOfDay = due.hour === 23 && due.minute === 59;
  const time = endOfDay
    ? ""
    : ` ${new Intl.DateTimeFormat("en-US", { timeZone: PROGRAM_TZ, hour: "numeric", minute: "2-digit" }).format(dueAt)}`;
  if (sameDay(due, today)) return `today${time}`;
  if (sameDay(due, tomorrow)) return `tomorrow${time}`;
  const date = new Intl.DateTimeFormat("en-US", { timeZone: PROGRAM_TZ, weekday: "short", month: "short", day: "numeric" }).format(dueAt);
  return `${date}${time}`;
}

/** End of a day picked in a date input (YYYY-MM-DD), in the program's time zone. */
export function endOfLocalDay(value: string) {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return zoned(Number(m[1]), Number(m[2]), Number(m[3]), 23, 59);
}

export function isOverdue(c: { status: string; dueAt: Date }, now = new Date()) {
  return c.status === "open" && c.dueAt.getTime() < now.getTime();
}
