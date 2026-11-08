import webpush from "web-push";
import { prisma } from "@/lib/db";
import { getProgramSettings } from "@/lib/settings";

/**
 * Phone and Apple Watch notifications.
 *
 * Teens, parents, coaches, and interns turn them on from "Phone & Apple Watch" in the portal. On an
 * iPhone the portal must first be added to the Home Screen (Apple's rule for web apps). iPhone
 * notifications then appear on a paired Apple Watch automatically.
 *
 * Keys are created on first use and saved in program settings, so there's nothing to configure.
 * VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY env vars override them if you'd rather manage keys yourself.
 *
 * Messages never include private content (chat text, notes): only who and when, because
 * notifications show on lock screens and watch faces.
 */
export type PushMessage = { title: string; body: string; url: string; tag?: string };

let configured: { publicKey: string } | null = null;

export async function vapidKeys() {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    return { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  }
  const settings = await getProgramSettings();
  if (settings.vapidPublicKey && settings.vapidPrivateKey) {
    return { publicKey: settings.vapidPublicKey, privateKey: settings.vapidPrivateKey };
  }
  const keys = webpush.generateVAPIDKeys();
  // Only fill the keys if no one else saved them first.
  await prisma.programSettings.updateMany({
    where: { id: "default", vapidPublicKey: "" },
    data: { vapidPublicKey: keys.publicKey, vapidPrivateKey: keys.privateKey },
  });
  const saved = await getProgramSettings();
  return { publicKey: saved.vapidPublicKey, privateKey: saved.vapidPrivateKey };
}

async function configure() {
  if (configured) return configured;
  const { publicKey, privateKey } = await vapidKeys();
  const contact = process.env.PUSH_CONTACT_EMAIL || "rebecca@coachme2.world";
  webpush.setVapidDetails(`mailto:${contact}`, publicKey, privateKey);
  configured = { publicKey };
  return configured;
}

/** Sends to every device a person turned notifications on for. Never throws: a failed push shouldn't break a page. */
export async function notifyUsers(userIds: string[], message: PushMessage) {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) return;
  try {
    const subscriptions = await prisma.pushSubscription.findMany({ where: { userId: { in: ids } } });
    if (subscriptions.length === 0) return;
    await configure();
    const payload = JSON.stringify(message);
    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
            { TTL: 60 * 60 * 12 },
          );
        } catch (error) {
          const status = (error as { statusCode?: number }).statusCode;
          // 404/410: the person removed the app or turned notifications off.
          if (status === 404 || status === 410) {
            await prisma.pushSubscription.deleteMany({ where: { id: sub.id } });
          }
        }
      }),
    );
  } catch (error) {
    console.error("push failed", error);
  }
}

/** Notifies by email address (handy where the code knows who someone is but not their login id). */
export async function notifyEmails(emails: string[], message: PushMessage) {
  const users = await prisma.user.findMany({ where: { email: { in: emails.filter(Boolean) } }, select: { id: true } });
  await notifyUsers(
    users.map((u) => u.id),
    message,
  );
}
