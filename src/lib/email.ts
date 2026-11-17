import { prisma } from "@/lib/db";
import { getProgramSettings } from "@/lib/settings";
import { sendEmail } from "@/lib/invite";

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

  // Sent when email is set up (SMTP_USER / SMTP_PASS); always logged.
  const sent = await sendEmail(opts.toEmail, settings.confirmationEmailSubject, body);
  await prisma.emailLog.create({
    data: {
      appointmentId: opts.appointmentId,
      toEmail: opts.toEmail,
      subject: settings.confirmationEmailSubject,
      body,
      status: sent ? "sent" : "queued_local",
    },
  });

  return { subject: settings.confirmationEmailSubject, body };
}
