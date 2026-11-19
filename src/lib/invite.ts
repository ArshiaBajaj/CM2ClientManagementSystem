import { createHash, randomBytes } from "node:crypto";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/db";
import { googleEnabled } from "@/lib/google";
import { httpsUrl } from "@/lib/public-url";

/**
 * Welcome emails. When a manager adds someone, they get an email with a one-time link to choose their own
 * password (or they can just use "Sign in with Google"). No temporary passwords to pass around.
 *
 * Turned on by Vercel environment variables:
 *   SMTP_USER  the Gmail address that sends (e.g. the program's Gmail)
 *   SMTP_PASS  a Google "app password" for that account (16 letters)
 * Optional: SMTP_HOST / SMTP_PORT for a non-Gmail provider, EMAIL_FROM_NAME (default "Coach Me 2").
 */
const INVITE_DAYS = 14;

export function emailReady() {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

let transport: ReturnType<typeof nodemailer.createTransport> | null = null;
function mailer() {
  if (!transport) {
    const host = process.env.SMTP_HOST || "smtp.gmail.com";
    const port = Number(process.env.SMTP_PORT || 465);
    transport = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: (process.env.SMTP_PASS ?? "").replace(/\s+/g, "") },
    });
  }
  return transport;
}

export async function sendEmail(to: string, subject: string, text: string, html?: string) {
  if (!emailReady()) return false;
  try {
    await mailer().sendMail({
      from: { name: process.env.EMAIL_FROM_NAME || "Coach Me 2", address: process.env.SMTP_USER ?? "" },
      to,
      subject,
      text,
      html,
    });
    return true;
  } catch (error) {
    console.error("Email not sent:", error instanceof Error ? error.message : error);
    return false;
  }
}

export const hashInvite = (token: string) => createHash("sha256").update(token).digest("hex");

/** The site's own address for links in emails. */
export function siteOrigin(requestUrl: string) {
  return httpsUrl(process.env.APP_URL) ?? new URL(requestUrl).origin;
}

const ROLE_WORDS: Record<string, string> = {
  client: "your Coach Me 2 student space: sessions, goals, and messages with your coach",
  guardian: "the Coach Me 2 family portal: your teen's sessions, forms, and updates",
  coach: "the Coach Me 2 coach workspace",
  intern: "the Coach Me 2 intern workspace: tasks, team chat, and shared documents",
  team_lead: "the Coach Me 2 manager workspace",
  admin: "the Coach Me 2 manager workspace",
};

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * Emails one person a welcome with a fresh one-time "set your password" link. Any earlier link stops working.
 * Returns false (and changes nothing) when email isn't set up or the send fails.
 */
export async function sendWelcome(email: string, origin: string, invitedBy: string, opts: { reminder?: boolean } = {}) {
  if (!emailReady()) return false;
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) return false;

  const token = randomBytes(32).toString("base64url");
  const link = `${origin}/welcome?t=${token}`;
  const first = user.name.split(/\s+/)[0] || "there";
  const what = ROLE_WORDS[user.role] ?? "the Coach Me 2 portal";
  const google = googleEnabled();
  const subject = opts.reminder ? "Reminder: your Coach Me 2 account is waiting" : "You're invited to Coach Me 2";
  const text = [
    `Hi ${first},`,
    ``,
    opts.reminder ? `Just a reminder: ${invitedBy} added you to ${what}, and you haven't signed in yet.` : `${invitedBy} added you to ${what}.`,
    ``,
    `Set your password and sign in here (link works for ${INVITE_DAYS} days):`,
    link,
    ...(google ? [``, `Or go to ${origin} and click "Sign in with Google" using ${user.email}.`] : []),
    ``,
    `Coaching is not therapy or crisis care. If you are in immediate danger, call local emergency services. In the U.S., call or text 988.`,
    ``,
    `If you weren't expecting this, you can ignore this email.`,
  ].join("\n");
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#16202b;max-width:520px">
<p>Hi ${escape(first)},</p>
<p>${opts.reminder ? `Just a reminder: ${escape(invitedBy)} added you to ${escape(what)}, and you haven't signed in yet. It takes two minutes.` : `${escape(invitedBy)} added you to ${escape(what)}.`}</p>
<p style="margin:28px 0"><a href="${link}" style="background:#16202b;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:600">Set your password</a></p>
<p style="color:#555;font-size:13px">The button works for ${INVITE_DAYS} days.${
    google ? ` You can also go to <a href="${origin}">${escape(origin.replace(/^https?:\/\//, ""))}</a> and click <b>Sign in with Google</b> using ${escape(user.email)}.` : ""
  }</p>
<p style="color:#777;font-size:12px;margin-top:32px">Coaching is not therapy or crisis care. If you are in immediate danger, call local emergency services. In the U.S., call or text 988.<br>If you weren't expecting this, you can ignore this email.</p>
</div>`;

  await prisma.user.update({
    where: { id: user.id },
    data: { inviteTokenHash: hashInvite(token), inviteExpiresAt: new Date(Date.now() + INVITE_DAYS * 86_400_000) },
  });
  const sent = await sendEmail(user.email, subject, text, html);
  await prisma.emailLog.create({
    data: { toEmail: user.email, subject, body: `Welcome email (${user.role})`, status: sent ? "sent" : "failed" },
  });
  if (!sent) {
    await prisma.user.update({ where: { id: user.id }, data: { inviteTokenHash: null, inviteExpiresAt: null } });
  }
  return sent;
}

/** Welcomes several people; returns the emails that were sent. */
export async function sendWelcomes(emails: string[], origin: string, invitedBy: string) {
  const sent: string[] = [];
  for (const email of emails) {
    if (await sendWelcome(email, origin, invitedBy)) sent.push(email);
  }
  return sent;
}
