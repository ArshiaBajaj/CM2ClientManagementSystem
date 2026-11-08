import { prisma } from "@/lib/db";

export async function getProgramSettings() {
  return prisma.programSettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });
}

export const PERMISSIONS = {
  studentsCanBook: { label: "Students can book their own sessions", default: true },
  parentsCanBook: { label: "Parents can book sessions for their student", default: true },
  coachesCanArchive: { label: "Coaches can archive their own students", default: false },
  coachesCanAddCredits: { label: "Coaches can add credits for their students", default: false },
  aiScribeEnabled: { label: "AI scribe is available in sessions", default: true },
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;
export type Permissions = Record<PermissionKey, boolean>;

export function parsePermissions(raw: string): Permissions {
  let stored: Record<string, unknown> = {};
  try {
    stored = JSON.parse(raw || "{}") as Record<string, unknown>;
  } catch {
    stored = {};
  }
  return Object.fromEntries(
    Object.entries(PERMISSIONS).map(([key, def]) => [
      key,
      typeof stored[key] === "boolean" ? stored[key] : def.default,
    ]),
  ) as Permissions;
}

export async function getPermissions() {
  return parsePermissions((await getProgramSettings()).rolePermissionsJson);
}
