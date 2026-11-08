import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canAccessClient, isStaff } from "@/lib/access";
import { prisma } from "@/lib/db";
import { parseFields } from "@/lib/forms";
import { generateScribeNotes } from "@/lib/scribe";
import { getPermissions } from "@/lib/settings";

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user || !isStaff(user)) return NextResponse.redirect(new URL("/login", request.url), 303);

  const form = await request.formData();
  const appointmentId = String(form.get("appointmentId") ?? "").trim();
  const intent = String(form.get("intent") ?? "generate").trim();
  const back = (key: string, message: string) =>
    NextResponse.redirect(new URL(`/calendar/${appointmentId}?${key}=${encodeURIComponent(message)}`, request.url), 303);

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { aiNote: true, appointmentType: true, client: true, coach: true },
  });
  if (!appointment) return NextResponse.redirect(new URL("/calendar?error=Appointment%20not%20found", request.url), 303);
  const access = await canAccessClient(user, appointment.clientId);
  if (!access.ok) return NextResponse.redirect(new URL("/calendar?error=Access%20denied", request.url), 303);

  const instructions =
    appointment.appointmentType?.aiScribeInstructions ||
    appointment.aiNote?.instructions ||
    "Summarize the session for coach follow-up.";

  if (intent === "generate") {
    const permissions = await getPermissions();
    if (!permissions.aiScribeEnabled || !appointment.aiScribeEnabled || appointment.client.aiScribeOptOut) {
      return back("error", "The AI scribe is off for this session. Write notes by hand below.");
    }
    const transcript = String(form.get("transcript") ?? "").trim();
    if (transcript.length < 40) return back("error", "Paste the session transcript first");

    const scribeForm = appointment.appointmentType?.scribeFormKey
      ? await prisma.formTemplate.findUnique({ where: { key: appointment.appointmentType.scribeFormKey } })
      : null;
    const { notes, engine } = await generateScribeNotes({
      instructions,
      sections: scribeForm ? parseFields(scribeForm.schemaJson) : [],
      transcript: transcript.slice(0, 60_000),
      clientFirstName: appointment.client.firstName,
      coachName: appointment.coach.name,
    });

    await prisma.aiSessionNote.upsert({
      where: { appointmentId },
      update: { transcript, generatedNotes: notes, editedNotes: notes, instructions, status: `generated:${engine}` },
      create: { appointmentId, transcript, generatedNotes: notes, editedNotes: notes, instructions, status: `generated:${engine}` },
    });
    return back("notice", "Draft notes ready. Review and edit, then save.");
  }

  const editedNotes = String(form.get("editedNotes") ?? "").trim();
  await prisma.aiSessionNote.upsert({
    where: { appointmentId },
    update: { editedNotes, status: "reviewed" },
    create: { appointmentId, instructions, editedNotes, generatedNotes: "", status: "reviewed" },
  });
  return back("notice", "Notes saved");
}
