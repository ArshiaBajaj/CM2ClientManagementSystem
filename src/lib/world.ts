import atlas from "world-atlas/countries-110m.json";
import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { isLeadOrAdmin, resolveCoachId } from "@/lib/access";

/**
 * World View: teens around the world, matched into small cross-border circles.
 *
 * Safety rules (these are minors):
 * - Opt-in only, and a parent or guardian must say yes first (Consent kind "world_circle").
 * - Country only. Never a city, school, photo, or contact detail. Members see first names and countries.
 * - Circles are groups of 3–6, never one-on-one, and open only after a manager assigns a moderating coach.
 * - Everything said in a circle is visible to the moderating coach and program managers.
 * - Coaches' private clients never appear.
 */
export const WORLD_CONSENT = "world_circle";
export const MIN_CIRCLE = 3;
export const MAX_CIRCLE = 6;

export const WORLD_INTERESTS = [
  "Purpose & ikigai",
  "School & focus",
  "Friendship & belonging",
  "Health & energy",
  "Creativity",
  "Leadership",
  "College & careers",
  "Sports",
] as const;

type Geometry = { properties: { name: string } };
const geometries = (atlas as unknown as { objects: { countries: { geometries: Geometry[] } } }).objects.countries.geometries;
export const COUNTRIES = [...new Set(geometries.map((g) => g.properties.name))].sort((a, b) => a.localeCompare(b));

/** Countries with Coach Me 2 teens and how many (exact counts under 3 are hidden publicly). */
export async function countryCounts() {
  const rows = await prisma.client.groupBy({
    by: ["country"],
    where: { program: "cm2", archivedAt: null, country: { not: null } },
    _count: { _all: true },
  });
  return rows
    .filter((r) => r.country)
    .map((r) => ({ country: r.country as string, count: r._count._all }))
    .sort((a, b) => b.count - a.count);
}

export async function hasWorldConsent(clientId: string) {
  return Boolean(await prisma.consent.findFirst({ where: { clientId, kind: WORLD_CONSENT } }));
}

/** Who may read and post in a circle: its teens, the moderating coach, and managers. */
export async function circleAccess(user: SessionUser, circleId: string) {
  const circle = await prisma.worldCircle.findUnique({ where: { id: circleId }, include: { members: true } });
  if (!circle) return null;
  if (isLeadOrAdmin(user)) return circle;
  if (user.role === "coach") {
    const coachId = await resolveCoachId(user);
    return coachId && circle.coachId === coachId ? circle : null;
  }
  if (user.role === "client" && user.clientId) {
    return circle.status === "active" && circle.members.some((m) => m.clientId === user.clientId) ? circle : null;
  }
  return null;
}

/**
 * Proposes circles from teens who opted in, have a parent's yes, and aren't in an open circle.
 * Groups by shared interest, mixing countries: each circle needs at least two countries.
 */
export async function proposeCircles() {
  const busy = await prisma.worldCircleMember.findMany({
    where: { circle: { status: { in: ["proposed", "active"] } } },
    select: { clientId: true },
  });
  const pool = await prisma.client.findMany({
    where: {
      program: "cm2",
      archivedAt: null,
      worldOptIn: true,
      country: { not: null },
      id: { notIn: busy.map((b) => b.clientId) },
      consents: { some: { kind: WORLD_CONSENT } },
    },
    select: { id: true, country: true, worldInterests: true },
  });

  const used = new Set<string>();
  const created: string[] = [];
  for (const theme of WORLD_INTERESTS) {
    const fans = pool.filter((t) => !used.has(t.id) && t.worldInterests.split("|").includes(theme));
    // Interleave by country so each circle spans borders.
    const byCountry = new Map<string, typeof fans>();
    for (const t of fans) byCountry.set(t.country!, [...(byCountry.get(t.country!) ?? []), t]);
    const queue: typeof fans = [];
    while ([...byCountry.values()].some((list) => list.length)) {
      for (const list of byCountry.values()) {
        const next = list.shift();
        if (next) queue.push(next);
      }
    }
    while (queue.length >= MIN_CIRCLE) {
      const group = queue.splice(0, MAX_CIRCLE);
      if (new Set(group.map((g) => g.country)).size < 2) break;
      const circle = await prisma.worldCircle.create({
        data: {
          name: `${theme} · ${[...new Set(group.map((g) => g.country))].slice(0, 3).join(" · ")}`,
          theme,
          members: { create: group.map((g) => ({ clientId: g.id })) },
        },
      });
      group.forEach((g) => used.add(g.id));
      created.push(circle.id);
    }
  }
  return created;
}
