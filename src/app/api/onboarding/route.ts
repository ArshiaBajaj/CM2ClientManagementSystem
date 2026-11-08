import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { answersFromForm, coachGate } from "@/lib/gate";

function back(request: NextRequest, key: string, message: string, fill = "") {
  const url = new URL("/onboarding", request.url);
  url.searchParams.set(key, message);
  if (fill) url.searchParams.set("fill", fill);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 303);
  if (user.role !== "coach") return back(request, "error", "Coach forms are for coaches");
  if ((await coachGate(user)) === "inactive") return back(request, "error", "Your coach account is not active yet");

  const roster = await prisma.coachRoster.findFirst({
    where: { OR: [{ coachId: user.coachId ?? "" }, { email: user.email }] },
  });
  if (!roster) return back(request, "error", "No coach record is linked to this login");

  const form = await request.formData();
  const packetId = String(form.get("packetId") ?? "");
  const packet = await prisma.accessPacket.findUnique({ where: { id: packetId } });
  if (!packet || !packet.active || packet.audience !== "coach") return back(request, "error", "Form not found");

  const agreed = String(form.get("agree") ?? "") === "1";
  const signature = String(form.get("signature") ?? "").trim();
  if (!agreed) return back(request, "error", "Tick the box to confirm", packet.key);
  if (signature.length < 3) return back(request, "error", "Type your full name to sign", packet.key);

  let answers: Record<string, string> = {};
  if (packet.kind === "form") {
    const parsed = answersFromForm(packet.schemaJson, form);
    if (parsed.error) return back(request, "error", parsed.error, packet.key);
    answers = parsed.answers;
    const focus = Object.entries(answers).find(([key]) => key.includes("area") || key.includes("focus"))?.[1] ?? "";
    const capacity = Number(
      String(Object.entries(answers).find(([key]) => key.includes("student") || key.includes("capacity"))?.[1] ?? "").replace(/\D/g, ""),
    );
    await prisma.coachRoster.update({
      where: { coachId: roster.coachId },
      data: {
        ...(focus ? { focusAreas: focus.toLowerCase() } : {}),
        ...(Number.isFinite(capacity) && capacity > 0 ? { capacity } : {}),
      },
    });
  }

  await prisma.accessCompletion.upsert({
    where: { packetId_subjectKey_signerRole: { packetId: packet.id, subjectKey: roster.coachId, signerRole: "coach" } },
    update: { signerName: signature, signerUserId: user.id, answersJson: JSON.stringify(answers), version: packet.version, completedAt: new Date() },
    create: {
      packetId: packet.id,
      subjectKey: roster.coachId,
      signerRole: "coach",
      signerName: signature,
      signerUserId: user.id,
      answersJson: JSON.stringify(answers),
      version: packet.version,
    },
  });

  await prisma.auditEvent.create({
    data: {
      actorId: user.id,
      action: "CoachFormCompleted",
      entity: "AccessPacket",
      entityId: packet.id,
      metadata: JSON.stringify({ coachId: roster.coachId, version: packet.version }),
    },
  });

  const ready = (await coachGate(user)) === "ready";
  return back(
    request,
    "notice",
    ready ? `${packet.title} signed. Your coach workspace is open.` : `${packet.title} signed.`,
  );
}
