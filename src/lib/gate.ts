import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseFields } from "@/lib/forms";

export type PacketView = {
  id: string;
  key: string;
  audience: string;
  kind: string;
  title: string;
  description: string;
  body: string;
  schemaJson: string;
  version: string;
  done: boolean;
  signerName: string | null;
  completedAt: Date | null;
};

async function rosterFor(user: SessionUser) {
  if (user.role !== "coach") return null;
  return prisma.coachRoster.findFirst({
    where: { OR: [{ coachId: user.coachId ?? "" }, { email: user.email }] },
  });
}

export async function packetsFor(subjectKey: string, audience: string): Promise<PacketView[]> {
  const packets = await prisma.accessPacket.findMany({
    where: { active: true, audience },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
  });
  if (packets.length === 0) return [];
  const completions = await prisma.accessCompletion.findMany({
    where: { subjectKey, signerRole: audience, packetId: { in: packets.map((p) => p.id) } },
  });
  return packets.map((packet) => {
    const completion = completions.find((c) => c.packetId === packet.id && c.version === packet.version);
    return {
      id: packet.id,
      key: packet.key,
      audience: packet.audience,
      kind: packet.kind,
      title: packet.title,
      description: packet.description,
      body: packet.body,
      schemaJson: packet.schemaJson,
      version: packet.version,
      done: Boolean(completion),
      signerName: completion?.signerName ?? null,
      completedAt: completion?.completedAt ?? null,
    };
  });
}

export async function coachGate(user: SessionUser): Promise<"inactive" | "forms" | "ready"> {
  const roster = await rosterFor(user);
  if (!roster || roster.status !== "active") return "inactive";
  if (roster.expiresAt && roster.expiresAt.getTime() < Date.now()) return "inactive";
  const packets = await packetsFor(roster.coachId, "coach");
  if (packets.length === 0 || packets.some((packet) => !packet.done)) return "forms";
  return "ready";
}

export async function internRecord(user: SessionUser) {
  if (user.role !== "intern") return null;
  if (user.internId) {
    const linked = await prisma.intern.findUnique({ where: { id: user.internId }, include: { team: true } });
    if (linked) return linked;
  }
  return prisma.intern.findUnique({ where: { email: user.email }, include: { team: true } });
}

export async function parentInterns(user: SessionUser) {
  if (user.role !== "intern_parent") return [];
  return prisma.intern.findMany({
    where: { parentEmail: user.email },
    include: { team: true },
    orderBy: { firstName: "asc" },
  });
}

export async function internClearance(internId: string) {
  const [internPackets, parentPackets] = await Promise.all([
    packetsFor(internId, "intern"),
    packetsFor(internId, "intern_parent"),
  ]);
  const internDone = internPackets.length > 0 && internPackets.every((packet) => packet.done);
  const parentDone = parentPackets.length > 0 && parentPackets.every((packet) => packet.done);
  return { internPackets, parentPackets, internDone, parentDone, ready: internDone && parentDone };
}

export async function homeFor(user: SessionUser) {
  if (user.mustChangePassword) return "/account/password?first=1";
  if (user.role === "coach") {
    const gate = await coachGate(user);
    if (gate === "forms") return "/onboarding";
    return "/workspace";
  }
  if (user.role === "intern_parent") return "/intern/start";
  if (user.role === "intern") {
    const intern = await internRecord(user);
    if (!intern) return "/intern/start";
    return (await internClearance(intern.id)).ready ? "/intern" : "/intern/start";
  }
  return "/workspace";
}

/** Where a signed-in person is sent when the current page is outside their access. */
export async function lockDestination(user: SessionUser, path: string) {
  if (!path || path.startsWith("/account") || path.startsWith("/api") || path === "/login") return null;
  if (user.role === "coach") {
    const gate = await coachGate(user);
    if (gate === "inactive" && path !== "/workspace") return "/workspace";
    if (gate === "forms" && path !== "/onboarding") return "/onboarding";
    return null;
  }
  if (user.role === "intern_parent") return path === "/intern/start" ? null : "/intern/start";
  if (user.role === "intern") {
    const intern = await internRecord(user);
    const ready = intern ? (await internClearance(intern.id)).ready : false;
    if (!ready && path !== "/intern/start") return "/intern/start";
    if (ready && !path.startsWith("/intern")) return "/intern";
    return null;
  }
  return null;
}

/** Blocks client-workspace pages for interns and for coaches who have not finished forms. */
export async function guardClientWorkspace(user: SessionUser) {
  if (user.role === "intern" || user.role === "intern_parent") redirect(await homeFor(user));
  if (user.role !== "coach") return;
  const gate = await coachGate(user);
  if (gate === "forms") redirect("/onboarding");
  if (gate === "inactive") redirect("/workspace");
}

export async function denyClosed(user: SessionUser, request: NextRequest) {
  if (user.role === "intern" || user.role === "intern_parent") {
    return NextResponse.redirect(new URL(await homeFor(user), request.url), 303);
  }
  if (user.role !== "coach") return null;
  const gate = await coachGate(user);
  if (gate === "ready") return null;
  return NextResponse.redirect(new URL(gate === "forms" ? "/onboarding" : "/workspace", request.url), 303);
}

export function answersFromForm(schemaJson: string, form: FormData) {
  const fields = parseFields(schemaJson);
  const answers: Record<string, string> = {};
  for (const field of fields) {
    const value = String(form.get(field.id) ?? "").trim();
    if (!value && field.required !== false) {
      return { error: `Please answer: ${field.label}`, answers };
    }
    answers[field.id] = value.slice(0, 4000);
  }
  if (fields.length === 0) return { error: "This form has no questions yet", answers };
  return { error: null, answers };
}

export async function ensureProgramChannels() {
  await prisma.internChannel.upsert({
    where: { key: "all" },
    update: {},
    create: { key: "all", name: "All interns", kind: "all" },
  });
  await prisma.internChannel.upsert({
    where: { key: "between" },
    update: {},
    create: { key: "between", name: "Between teams", kind: "between" },
  });
}

export async function ensureTeamChannel(teamId: string, teamName: string) {
  await prisma.internChannel.upsert({
    where: { key: `team:${teamId}` },
    update: { name: teamName },
    create: { key: `team:${teamId}`, name: teamName, kind: "team", teamId },
  });
}

export async function accessOverview() {
  const [coaches, interns, packets, completions] = await Promise.all([
    prisma.coachRoster.findMany({ where: { status: "active" }, orderBy: { name: "asc" } }),
    prisma.intern.findMany({ include: { team: true }, orderBy: { lastName: "asc" } }),
    prisma.accessPacket.findMany({ where: { active: true } }),
    prisma.accessCompletion.findMany(),
  ]);

  const done = (subjectKey: string, audience: string) => {
    const required = packets.filter((packet) => packet.audience === audience);
    return (
      required.length > 0 &&
      required.every((packet) =>
        completions.some(
          (completion) =>
            completion.packetId === packet.id &&
            completion.subjectKey === subjectKey &&
            completion.signerRole === audience &&
            completion.version === packet.version,
        ),
      )
    );
  };

  return {
    coaches: coaches.map((coach) => ({ ...coach, formsDone: done(coach.coachId, "coach") })),
    interns: interns.map((intern) => ({
      ...intern,
      internDone: done(intern.id, "intern"),
      parentDone: done(intern.id, "intern_parent"),
    })),
  };
}

/** Tasks an intern may see: their team, plus anything shared with every intern. */
export function visibleTaskWhere(teamId: string) {
  return { OR: [{ teamId: null }, { teamId }] };
}
