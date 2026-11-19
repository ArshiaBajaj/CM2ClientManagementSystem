import { createHash } from "node:crypto";

/**
 * Has this password shown up in a known data breach? Uses the Have I Been Pwned "range" API: only the first
 * 5 characters of the password's SHA-1 hash leave the server, never the password. If the check can't run
 * (network trouble), the password is allowed rather than blocking someone from signing in.
 */
export async function passwordWasBreached(password: string) {
  const hash = createHash("sha1").update(password).digest("hex").toUpperCase();
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);
  try {
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true", "User-Agent": "CoachMe2-portal" },
      signal: AbortSignal.timeout(2500),
      cache: "no-store",
    });
    if (!response.ok) return false;
    const body = await response.text();
    return body.split("\n").some((line) => {
      const [hashSuffix, count] = line.trim().split(":");
      return hashSuffix === suffix && Number(count) > 0;
    });
  } catch {
    return false;
  }
}

export const BREACHED_MESSAGE =
  "That password has appeared in a known data breach, so it's easy to guess. Please choose a different one.";
