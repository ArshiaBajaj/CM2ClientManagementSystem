import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notifyUsers, vapidKeys } from "@/lib/push";

/** The public key a device needs before it can subscribe. */
export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const { publicKey } = await vapidKeys();
  const count = await prisma.pushSubscription.count({ where: { userId: user.id } });
  return NextResponse.json({ publicKey, devices: count });
}

/** Turn notifications on or off for this device, or send a test. */
export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as {
    action?: string;
    subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  };
  const endpoint = body.subscription?.endpoint ?? "";

  if (body.action === "test") {
    await notifyUsers([user.id], {
      title: "Coach Me 2",
      body: "Notifications are on. Reminders will show here and on your Apple Watch.",
      url: "/account/devices",
      tag: "test",
    });
    return NextResponse.json({ ok: true });
  }

  if (!endpoint.startsWith("https://")) return NextResponse.json({ error: "Missing subscription" }, { status: 400 });

  if (body.action === "unsubscribe") {
    await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: user.id } });
    return NextResponse.json({ ok: true });
  }

  const p256dh = body.subscription?.keys?.p256dh ?? "";
  const auth = body.subscription?.keys?.auth ?? "";
  if (!p256dh || !auth) return NextResponse.json({ error: "Missing keys" }, { status: 400 });
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { userId: user.id, p256dh, auth },
    create: { userId: user.id, endpoint, p256dh, auth },
  });
  return NextResponse.json({ ok: true });
}
