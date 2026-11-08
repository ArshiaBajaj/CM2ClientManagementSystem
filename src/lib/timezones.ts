export const TIMEZONES = [
  ["America/New_York", "Eastern"],
  ["America/Chicago", "Central"],
  ["America/Denver", "Mountain"],
  ["America/Phoenix", "Arizona"],
  ["America/Los_Angeles", "Pacific"],
  ["America/Anchorage", "Alaska"],
  ["Pacific/Honolulu", "Hawaii"],
  ["Europe/London", "London"],
  ["Asia/Kolkata", "India"],
] as const;

export function timezoneLabel(tz: string) {
  return TIMEZONES.find(([key]) => key === tz)?.[1] ?? tz;
}

export function localTimeIn(tz: string) {
  try {
    return new Date().toLocaleTimeString([], { timeZone: tz, hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}
