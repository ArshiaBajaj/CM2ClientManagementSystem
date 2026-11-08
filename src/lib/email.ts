import { prisma } from "@/lib/db";
import { getProgramSettings } from "@/lib/settings";

export async function sendAppointmentConfirmation(opts: {
  appointmentId: string;
  toEmail: string;
  clientName: string;
  coachName: string;
  startsAt: Date;
  customBody?: string | null;
}) {
  const settings = await getProgramSettings();
  const body = (opts.customBody || settings.confirmationEmailBody)
    .replaceAll("{{clientName}}", opts.clientName)
    .replaceAll("{{coachName}}", opts.coachName)
    .replaceAll("{{startsAt}}", opts.startsAt.toLocaleString());

  // Local/dev: persist outbound email for audit; wire SMTP later via env.
  await prisma.emailLog.create({
    data: {
      appointmentId: opts.appointmentId,
      toEmail: opts.toEmail,
      subject: settings.confirmationEmailSubject,
      body,
      status: "queued_local",
    },
  });

  return { subject: settings.confirmationEmailSubject, body };
}
