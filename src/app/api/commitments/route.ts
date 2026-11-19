import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isLeadOrAdmin } from "@/lib/access";
import { prisma } from "@/lib/db";
import { alertUsers, postToTeamChat } from "@/lib/alerts";
import { dueLabel, endOfLocalDay } from "@/lib/commitments";
import { internClearance, internRecord, teamIdsOf } from "@/lib/gate";
import { audit } from "@/lib/security";

const PAGE = "/intern/commitments";

function go(request: NextRequest, key: "notice" | "error", message: string) {
  const url = new URL(PAGE, request.url);
  url.searchParams.set(key, message);
  return NextResponse.redirect(url, 303);
}

/** Add, finish, move, drop, or nudge an intern commitment. */
export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 303);
  const manager = isLeadOrAdmin(user);
  const me = user.role === "intern" ? await internRecord(user) : null;
  if (!manager && !me) return NextResponse.redirect(new URL("/workspace", request.url), 303);
  if (me && !(await internClearance(me.id)).ready) return NextResponse.redirect(new URL("/intern/start", request.url), 303);

  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");

  if (intent === "create") {
    const what = String(form.get("what") ?? "").trim().slice(0, 200);
    const dueAt = endOfLocalDay(String(form.get("dueOn") ?? ""));
    const internId = manager ? String(form.get("internId") ?? "") : me!.id;
    const owner = await prisma.intern.findUnique({ where: { id: internId }, include: { user: true } });
    if (!what || !dueAt || !owner) return go(request, "error", "Say what you'll do and pick a day");
    if (dueAt.getTime() < Date.now()) return go(request, "error", "Pick today or a day after");
    await prisma.internCommitment.create({
      data: { internId: owner.id, teamId: owner.teamId, what, dueAt, createdById: user.id, source: "form" },
    });
    await postToTeamChat(owner.teamId, `📌 ${owner.firstName} committed: ${what} (due ${dueLabel(dueAt)})`);
    if (manager && owner.user) {
      await alertUsers([owner.user.id], {
        title: "New commitment",
        body: `${user.name.split(" ")[0]} added: ${what} (due ${dueLabel(dueAt)}).`,
        url: PAGE,
        tag: "commitment",
      });
    }
    return go(request, "notice", `Added: ${what}, due ${dueLabel(dueAt)}`);
  }

  const commitment = await prisma.internCommitment.findUnique({
    where: { id: String(form.get("id") ?? "") },
    include: { intern: { include: { user: true } } },
  });
  if (!commitment) return go(request, "error", "That commitment is gone");
  const mine = me?.id === commitment.internId;
  const sameTeam = Boolean(me && teamIdsOf(me).includes(commitment.teamId ?? commitment.intern.teamId));
  if (!manager && !mine && !(intent === "nudge" && sameTeam)) return go(request, "error", "That one isn't yours");

  if (intent === "done") {
    await prisma.internCommitment.update({ where: { id: commitment.id }, data: { status: "done", doneAt: new Date() } });
    const late = commitment.dueAt.getTime() < Date.now();
    await postToTeamChat(
      commitment.teamId ?? commitment.intern.teamId,
      `✅ ${commitment.intern.firstName} finished: ${commitment.what}${late ? " (a little late)" : ""}`,
    );
    return go(request, "notice", `Done: ${commitment.what}. Nice work!`);
  }

  if (intent === "move") {
    const dueAt = endOfLocalDay(String(form.get("dueOn") ?? ""));
    if (!dueAt || dueAt.getTime() < Date.now()) return go(request, "error", "Pick today or a day after");
    await prisma.internCommitment.update({
      where: { id: commitment.id },
      data: { dueAt, status: "open", timesMoved: { increment: 1 }, remindedAt: null, overdueAt: null },
    });
    await postToTeamChat(
      commitment.teamId ?? commitment.intern.teamId,
      `🔁 ${commitment.intern.firstName} moved "${commitment.what}" to ${dueLabel(dueAt)}`,
    );
    return go(request, "notice", `Moved to ${dueLabel(dueAt)}. Your team can see the new date.`);
  }

  if (intent === "drop") {
    await prisma.internCommitment.update({ where: { id: commitment.id }, data: { status: "dropped" } });
    await audit("CommitmentDropped", "InternCommitment", commitment.id, user.id);
    return go(request, "notice", "Removed");
  }

  if (intent === "nudge") {
    if (commitment.status !== "open" || mine) return go(request, "error", "Nothing to nudge");
    if (commitment.intern.user) {
      await alertUsers([commitment.intern.user.id], {
        title: `${user.name.split(" ")[0]} is checking in`,
        body: `How's it going with "${commitment.what}"? It's due ${dueLabel(commitment.dueAt)}.`,
        url: PAGE,
        tag: `nudge-${commitment.id}`,
      });
    }
    return go(request, "notice", `Nudged ${commitment.intern.firstName}`);
  }

  return go(request, "error", "Unknown action");
}
