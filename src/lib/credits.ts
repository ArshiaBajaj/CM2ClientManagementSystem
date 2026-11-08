import { prisma } from "@/lib/db";
import { getProgramSettings } from "@/lib/settings";

export async function ensureWallet(householdId: string) {
  return prisma.creditWallet.upsert({
    where: { householdId },
    update: {},
    create: { householdId, balance: 0 },
  });
}

export async function addCredits(opts: {
  householdId: string;
  delta: number;
  reason: string;
  actorId?: string | null;
  appointmentId?: string | null;
}) {
  const wallet = await ensureWallet(opts.householdId);
  const updated = await prisma.creditWallet.update({
    where: { id: wallet.id },
    data: { balance: wallet.balance + opts.delta },
  });
  await prisma.creditLedger.create({
    data: {
      walletId: wallet.id,
      delta: opts.delta,
      reason: opts.reason,
      actorId: opts.actorId ?? null,
      appointmentId: opts.appointmentId ?? null,
    },
  });
  return updated;
}

export async function consumeCreditIfRequired(opts: {
  householdId: string;
  actorId: string;
  appointmentId: string;
}) {
  const settings = await getProgramSettings();
  if (!settings.creditsEnabled) {
    return { consumed: false as const, balance: null };
  }

  const wallet = await ensureWallet(opts.householdId);
  if (wallet.balance < 1) {
    throw new Error("No session credits remaining");
  }

  const updated = await addCredits({
    householdId: opts.householdId,
    delta: -1,
    reason: "appointment_booked",
    actorId: opts.actorId,
    appointmentId: opts.appointmentId,
  });

  return { consumed: true as const, balance: updated.balance };
}

export async function refundCreditIfEligible(opts: {
  householdId: string;
  appointmentId: string;
  startsAt: Date;
  actorId: string;
  force?: boolean;
}) {
  const settings = await getProgramSettings();
  if (!settings.creditsEnabled) return { refunded: false as const };

  const hoursUntil =
    (opts.startsAt.getTime() - Date.now()) / (1000 * 60 * 60);
  const byPolicy =
    settings.cancelPolicy === "always_refund"
      ? true
      : settings.cancelPolicy === "never_refund"
        ? false
        : hoursUntil >= settings.cancelRefundHours;
  const eligible = opts.force || byPolicy;
  if (!eligible) return { refunded: false as const };

  await addCredits({
    householdId: opts.householdId,
    delta: 1,
    reason: opts.force ? "credit_restored_by_coach" : "appointment_cancelled_refund",
    actorId: opts.actorId,
    appointmentId: opts.appointmentId,
  });

  return { refunded: true as const };
}
