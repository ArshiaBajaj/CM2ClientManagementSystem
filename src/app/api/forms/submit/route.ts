import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canAccessClient, isStaff } from "@/lib/access";
import { prisma } from "@/lib/db";
import { metricScores, parseFields } from "@/lib/forms";

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 303);
  if (user.role === "guardian") {
    return NextResponse.redirect(new URL("/workspace?error=Student%20forms%20are%20confidential", request.url), 303);
  }

  const form = await request.formData();
  const templateId = String(form.get("templateId") ?? "").trim();
  const clientId = String(form.get("clientId") ?? "").trim();
  const back = (key: string, message: string, extra = "") =>
    NextResponse.redirect(
      new URL(`/forms?${key}=${encodeURIComponent(message)}${isStaff(user) ? `&clientId=${clientId}` : ""}${extra}`, request.url),
      303,
    );

  const access = await canAccessClient(user, clientId);
  if (!access.ok || !access.client) return back("error", "Access denied");

  const template = await prisma.formTemplate.findUnique({ where: { id: templateId } });
  if (!template || !template.active) return back("error", "Form not found");
  if (template.audience === "coach" && !isStaff(user)) return back("error", "That form is for coaches");
  if (template.audience === "client" && isStaff(user) && String(form.get("onBehalf") ?? "") !== "1") {
    return back("error", "Confirm you are entering this on the student's behalf");
  }

  const fields = parseFields(template.schemaJson);
  const answers: Record<string, string> = {};
  for (const field of fields) {
    const value = String(form.get(field.id) ?? "").trim();
    if (!value && field.required !== false) {
      return back("error", `Please answer: ${field.label}`, `&fill=${template.key}`);
    }
    answers[field.id] = value.slice(0, 4000);
  }

  await prisma.formSubmission.create({
    data: { templateId, clientId, answersJson: JSON.stringify(answers), submittedById: user.id },
  });

  const scores = metricScores(fields, answers);
  if (scores.wellbeing !== null || scores.fulfillment !== null) {
    const previous = await prisma.metricSnapshot.findFirst({
      where: { clientId },
      orderBy: { capturedAt: "desc" },
    });
    await prisma.metricSnapshot.create({
      data: {
        clientId,
        stage: template.stage,
        wellBeingScore: scores.wellbeing ?? previous?.wellBeingScore ?? 0,
        fulfillmentScore: scores.fulfillment ?? previous?.fulfillmentScore ?? 0,
        notes: `From ${template.name} (${access.client.publicId})`,
      },
    });
  }

  if (template.key === "ai_scribe_consent") {
    const choice = fields.find((f) => f.type === "choice");
    const optOut = !/^yes/i.test(choice ? answers[choice.id] ?? "" : "");
    await prisma.client.update({ where: { id: clientId }, data: { aiScribeOptOut: optOut } });
    await prisma.appointment.updateMany({
      where: { clientId, status: "scheduled", startsAt: { gte: new Date() } },
      data: { aiScribeEnabled: !optOut },
    });
  }

  await prisma.formRelease.updateMany({
    where: { templateId, clientId, status: { in: ["scheduled", "released"] } },
    data: { status: "completed" },
  });

  return back("notice", `${template.name} submitted. Thank you!`);
}
