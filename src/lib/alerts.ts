import { prisma } from "@/lib/db";
import { emailReady, sendEmail } from "@/lib/invite";
import { notifyUsers, type PushMessage } from "@/lib/push";
import { httpsUrl } from "@/lib/public-url";

/**
 * Reminders that matter go to every phone a person turned on AND to their email (on by default; they can switch
 * email off under "Phone & Apple Watch"). Like phone notifications, emails never include private content.
 */
export async function alertUsers(userIds: string[], message: PushMessage, opts: { lines?: string[] } = {}) {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) return;
  await notifyUsers(ids, message);
  if (!emailReady()) return;

  const origin = httpsUrl(process.env.APP_URL) ?? "https://cm2-workspace.vercel.app";
  const link = new URL(message.url, origin).toString();
  const people = await prisma.user.findMany({ where: { id: { in: ids }, emailNotifications: true }, select: { email: true, name: true } });
  for (const person of people) {
    const first = person.name.split(/\s+/)[0] || "there";
    const lines = opts.lines?.length ? opts.lines : [message.body];
    const text = [`Hi ${first},`, "", ...lines, "", `Open Coach Me 2: ${link}`, "", "Turn off email reminders any time under Phone & Apple Watch in the portal."].join("\n");
    const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
    const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#16202b;max-width:520px">
<p>Hi ${esc(first)},</p>
${lines.length > 1 ? `<ul style="padding-left:18px">${lines.map((l) => `<li style="margin:4px 0">${esc(l)}</li>`).join("")}</ul>` : `<p>${esc(lines[0])}</p>`}
<p style="margin:24px 0"><a href="${link}" style="background:#16202b;color:#fff;padding:11px 20px;border-radius:999px;text-decoration:none;font-weight:600">Open Coach Me 2</a></p>
<p style="color:#888;font-size:12px">Turn off email reminders any time under Phone &amp; Apple Watch in the portal.</p></div>`;
    await sendEmail(person.email, message.title, text, html);
  }
}

/** Posts a plain message to the program's Google Chat space, if a manager connected one in Settings. */
export async function postToGoogleChat(text: string) {
  const settings = await prisma.programSettings.findUnique({ where: { id: "default" }, select: { googleChatWebhook: true } });
  const url = settings?.googleChatWebhook ?? "";
  if (!url.startsWith("https://chat.googleapis.com/")) return false;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify({ text }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
