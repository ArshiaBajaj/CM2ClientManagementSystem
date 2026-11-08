import { prisma } from "@/lib/db";

export const RELEASE_ANCHORS = {
  after_booking: "After booking",
  before_appointment: "Before the appointment",
  after_appointment: "After the appointment",
} as const;

export function describeOffset(minutes: number) {
  if (minutes === 0) return "immediately";
  if (minutes % 1440 === 0) return `${minutes / 1440} day${minutes === 1440 ? "" : "s"}`;
  if (minutes % 60 === 0) return `${minutes / 60} hour${minutes === 60 ? "" : "s"}`;
  return `${minutes} minutes`;
}

/** Creates scheduled form releases for every active rule that applies to this booking. */
export async function scheduleReleasesForAppointment(opts: {
  appointmentId: string;
  clientId: string;
  startsAt: Date;
  endsAt: Date;
  appointmentKind: string;
  isFirstAppointment: boolean;
}) {
  const rules = await prisma.formReleaseRule.findMany({ where: { active: true } });
  const now = new Date();

  for (const rule of rules) {
    if (rule.appointmentKind !== "any" && rule.appointmentKind !== opts.appointmentKind) continue;
    if (rule.firstOnly && !opts.isFirstAppointment && opts.appointmentKind !== "first") continue;

    const template = await prisma.formTemplate.findUnique({ where: { key: rule.templateKey } });
    if (!template || !template.active) continue;

    if (rule.firstOnly) {
      const [alreadyDone, alreadySent] = await Promise.all([
        prisma.formSubmission.findFirst({ where: { templateId: template.id, clientId: opts.clientId } }),
        prisma.formRelease.findFirst({
          where: { templateId: template.id, clientId: opts.clientId, status: { not: "cancelled" } },
        }),
      ]);
      if (alreadyDone || alreadySent) continue;
    }

    const offset = rule.offsetMinutes * 60 * 1000;
    const releaseAt =
      rule.anchor === "after_booking"
        ? new Date(now.getTime() + offset)
        : rule.anchor === "before_appointment"
          ? new Date(Math.max(now.getTime(), opts.startsAt.getTime() - offset))
          : new Date(opts.endsAt.getTime() + offset);

    await prisma.formRelease.create({
      data: {
        templateId: template.id,
        clientId: opts.clientId,
        appointmentId: opts.appointmentId,
        ruleId: rule.id,
        releaseAt,
        status: releaseAt.getTime() <= now.getTime() ? "released" : "scheduled",
        trigger: `${rule.anchor}:${rule.offsetMinutes}m`,
      },
    });
  }
}

/** Releases anything whose time has come. Called on page loads; a cron job could call it too. */
export async function releaseDueForms() {
  const due = await prisma.formRelease.findMany({
    where: { status: "scheduled", releaseAt: { lte: new Date() } },
    include: { client: true, template: true },
  });
  for (const release of due) {
    await prisma.formRelease.update({ where: { id: release.id }, data: { status: "released" } });
    if (release.client.email) {
      await prisma.emailLog.create({
        data: {
          toEmail: release.client.email,
          subject: `New form: ${release.template.name}`,
          body: `Hi ${release.client.firstName}, a new form is ready in your Coach Me 2 workspace: ${release.template.name}.`,
          status: "queued_local",
        },
      });
    }
  }
  return due.length;
}

/** Drops releases tied to an appointment that will no longer happen. */
export async function cancelReleasesForAppointment(appointmentId: string) {
  await prisma.formRelease.updateMany({
    where: { appointmentId, status: "scheduled" },
    data: { status: "cancelled" },
  });
}
