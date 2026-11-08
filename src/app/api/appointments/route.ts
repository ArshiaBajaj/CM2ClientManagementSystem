import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSession, type SessionUser } from "@/lib/auth";
import {
  canAccessClient,
  getGuardianHouseholdId,
  isLeadOrAdmin,
  isStaff,
  resolveCoachId,
} from "@/lib/access";
import { prisma } from "@/lib/db";
import { consumeCreditIfRequired, ensureWallet, refundCreditIfEligible } from "@/lib/credits";
import { sendAppointmentConfirmation } from "@/lib/email";
import { getPermissions, getProgramSettings } from "@/lib/settings";
import { withinCoachAvailability } from "@/lib/matching";
import { cancelReleasesForAppointment, scheduleReleasesForAppointment } from "@/lib/releases";
import { denyClosed } from "@/lib/gate";

function safeReturn(form: FormData, fallback = "/calendar") {
  const value = String(form.get("returnTo") ?? "");
  return value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

function go(request: NextRequest, path: string, params: Record<string, string>) {
  const url = new URL(path, request.url);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 303);
  const closed = await denyClosed(user, request);
  if (closed) return closed;

  const form = await request.formData();
  const intent = String(form.get("intent") ?? "create").trim();
  const returnTo = safeReturn(form);

  if (intent === "cancel") return cancelAppointment(request, user, form, returnTo);
  if (intent === "no_show") return markStatus(request, user, form, "no_show", returnTo);
  if (intent === "complete") return markStatus(request, user, form, "completed", returnTo);
  if (intent === "restore_credit") return restoreCredit(request, user, form, returnTo);

  const fail = (message: string) => go(request, returnTo, { error: message });

  const clientId = String(form.get("clientId") ?? "").trim();
  const day = String(form.get("day") ?? "").trim();
  const startTime = String(form.get("startTime") ?? "").trim();
  const appointmentTypeId = String(form.get("appointmentTypeId") ?? "").trim();
  const repeatWeeks = Math.min(12, Math.max(1, Number(form.get("repeatWeeks") ?? 1) || 1));
  let coachId = String(form.get("coachId") ?? "").trim();

  if (!clientId || !day || !startTime) return fail("Client, day, and start time are required");

  const access = await canAccessClient(user, clientId);
  if (!access.ok || !access.client) return fail("Access denied");
  if (access.client.archivedAt) return fail("This client is archived. Unarchive them to book.");

  if (user.role === "guardian") {
    const householdId = await getGuardianHouseholdId(user);
    if (access.client.householdId !== householdId) return fail("Access denied");
  }

  const activeAssignment = access.client.assignments.find((a) => a.status === "active");

  if (user.role === "coach") {
    coachId = (await resolveCoachId(user)) ?? "";
    if (activeAssignment?.coachId !== coachId) return fail("You can only schedule your assigned clients");
  } else if (!isLeadOrAdmin(user) || !coachId) {
    coachId = activeAssignment?.coachId ?? "";
  }
  if (!coachId) return fail("This client has no coach yet. Pair them on the Matching page first.");

  const type = appointmentTypeId
    ? await prisma.appointmentType.findUnique({ where: { id: appointmentTypeId } })
    : await prisma.appointmentType.findFirst({ where: { active: true }, orderBy: { name: "asc" } });
  if (!type || !type.active) return fail("Choose an appointment type");

  const selfBooking = user.role === "client" || user.role === "guardian";
  const permissions = await getPermissions();
  if (user.role === "client" && !permissions.studentsCanBook) return fail("Your coach schedules your sessions");
  if (user.role === "guardian" && !permissions.parentsCanBook) return fail("Your student's coach schedules sessions");
  if (selfBooking && !type.clientCanBook) {
    return fail(`${type.name} can only be booked by your coach`);
  }

  const firstStart = new Date(`${day}T${startTime}:00`);
  if (Number.isNaN(firstStart.getTime())) return fail("Invalid date or time");
  if (firstStart.getTime() < Date.now()) return fail("Appointments must be in the future");

  const settings = await getProgramSettings();
  const priorCount = await prisma.appointment.count({
    where: { clientId, status: { in: ["scheduled", "completed"] } },
  });
  const seriesId = repeatWeeks > 1 ? randomUUID() : null;
  const booked: string[] = [];
  const skipped: string[] = [];

  for (let week = 0; week < repeatWeeks; week++) {
    const startsAt = new Date(firstStart.getTime() + week * 7 * 24 * 60 * 60 * 1000);
    const endsAt = new Date(startsAt.getTime() + type.durationMinutes * 60 * 1000);
    const label = startsAt.toLocaleDateString();

    if (selfBooking && !(await withinCoachAvailability(coachId, startsAt, endsAt))) {
      if (week === 0) return fail("That time is outside your coach's available hours");
      skipped.push(`${label} (outside coach hours)`);
      continue;
    }

    const overlapping = await prisma.appointment.findFirst({
      where: { coachId, status: "scheduled", startsAt: { lt: endsAt }, endsAt: { gt: startsAt } },
    });
    if (overlapping) {
      if (week === 0) return fail("The coach is already booked at that time");
      skipped.push(`${label} (coach busy)`);
      continue;
    }

    // Program credits only apply to Coach Me 2 clients, not a coach's own private clients.
    const usesCredits = settings.creditsEnabled && access.client.program === "cm2";
    if (usesCredits) {
      const wallet = await ensureWallet(access.client.householdId);
      if (wallet.balance < 1) {
        if (week === 0) return fail("No session credits left. Add credits before booking.");
        skipped.push(`${label} (no credits left)`);
        break;
      }
    }

    const meetingUrl = type.isVideo
      ? type.meetingProvider === "zoom_hipaa"
        ? `https://zoom.us/j/cm2-${clientId.slice(-6)}`
        : `https://meet.google.com/cm2-${clientId.slice(-6)}`
      : null;

    const appointment = await prisma.appointment.create({
      data: {
        clientId,
        coachId,
        appointmentTypeId: type.id,
        startsAt,
        endsAt,
        status: "scheduled",
        meetingUrl,
        seriesId,
        aiScribeEnabled: permissions.aiScribeEnabled && !access.client.aiScribeOptOut,
        createdById: user.id,
        aiNote: {
          create: { instructions: type.aiScribeInstructions, status: "pending" },
        },
      },
      include: { client: true, coach: true },
    });

    if (usesCredits) try {
      const credit = await consumeCreditIfRequired({
        householdId: access.client.householdId,
        actorId: user.id,
        appointmentId: appointment.id,
      });
      if (credit.consumed) {
        await prisma.appointment.update({ where: { id: appointment.id }, data: { creditConsumed: true } });
      }
    } catch {
      await prisma.aiSessionNote.deleteMany({ where: { appointmentId: appointment.id } });
      await prisma.appointment.delete({ where: { id: appointment.id } });
      if (week === 0) return fail("No session credits left. Add credits before booking.");
      skipped.push(`${label} (no credits left)`);
      break;
    }

    if (type.confirmationTiming !== "none") {
      const guardians = await prisma.guardian.findMany({
        where: { householdId: access.client.householdId, receivesNotifications: true },
      });
      const recipients = new Set<string>();
      if (appointment.client.email) recipients.add(appointment.client.email);
      for (const guardian of guardians) recipients.add(guardian.email);
      if (recipients.size === 0) recipients.add(user.email);
      for (const toEmail of recipients) {
        await sendAppointmentConfirmation({
          appointmentId: appointment.id,
          toEmail,
          clientName: `${appointment.client.firstName} ${appointment.client.lastName}`,
          coachName: appointment.coach.name,
          startsAt,
          customBody: type.confirmationEmailBody,
        });
      }
    }

    await scheduleReleasesForAppointment({
      appointmentId: appointment.id,
      clientId,
      startsAt,
      endsAt,
      appointmentKind: type.kind,
      isFirstAppointment: priorCount === 0 && week === 0,
    });

    await prisma.auditEvent.create({
      data: {
        actorId: user.id,
        action: "AppointmentBooked",
        entity: "Appointment",
        entityId: appointment.id,
        metadata: JSON.stringify({ type: type.name, seriesId, creditsEnabled: settings.creditsEnabled }),
      },
    });

    booked.push(appointment.id);
  }

  const notice =
    booked.length === 1
      ? "Appointment booked and confirmation email queued."
      : `${booked.length} weekly appointments booked.`;
  return go(request, returnTo, {
    notice: skipped.length ? `${notice} Skipped: ${skipped.join(", ")}.` : notice,
  });
}

async function loadForStaffOrOwner(user: SessionUser, appointmentId: string) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { client: true },
  });
  if (!appointment) return null;
  const access = await canAccessClient(user, appointment.clientId);
  return access.ok ? appointment : null;
}

async function cancelAppointment(request: NextRequest, user: SessionUser, form: FormData, returnTo: string) {
  const appointment = await loadForStaffOrOwner(user, String(form.get("appointmentId") ?? ""));
  if (!appointment || appointment.status !== "scheduled") {
    return go(request, returnTo, { error: "Scheduled appointment not found" });
  }

  await prisma.appointment.update({
    where: { id: appointment.id },
    data: { status: "cancelled", cancelledAt: new Date(), cancelReason: `cancelled_by_${user.role}` },
  });
  await cancelReleasesForAppointment(appointment.id);

  let notice = "Appointment cancelled.";
  if (appointment.creditConsumed) {
    const result = await refundCreditIfEligible({
      householdId: appointment.client.householdId,
      appointmentId: appointment.id,
      startsAt: appointment.startsAt,
      actorId: user.id,
    });
    if (result.refunded) {
      await prisma.appointment.update({ where: { id: appointment.id }, data: { creditConsumed: false } });
      notice += " The credit was returned.";
    } else {
      notice += " This was a late cancellation, so the credit was used. A coach can restore it.";
    }
  }
  return go(request, returnTo, { notice });
}

async function markStatus(
  request: NextRequest,
  user: SessionUser,
  form: FormData,
  status: "no_show" | "completed",
  returnTo: string,
) {
  if (!isStaff(user)) return go(request, returnTo, { error: "Only coaches and managers can do that" });
  const appointment = await loadForStaffOrOwner(user, String(form.get("appointmentId") ?? ""));
  if (!appointment || appointment.status !== "scheduled") {
    return go(request, returnTo, { error: "Scheduled appointment not found" });
  }

  await prisma.appointment.update({
    where: { id: appointment.id },
    data: { status, completedAt: status === "completed" ? new Date() : null },
  });

  if (status === "completed") {
    const assignment = await prisma.assignment.findFirst({
      where: { clientId: appointment.clientId, coachId: appointment.coachId, status: "active" },
      include: { sessionAllowance: true },
    });
    if (assignment?.sessionAllowance) {
      await prisma.sessionAllowance.update({
        where: { id: assignment.sessionAllowance.id },
        data: {
          used: assignment.sessionAllowance.used + 1,
          remaining: Math.max(0, assignment.sessionAllowance.remaining - 1),
        },
      });
    }
  } else {
    await cancelReleasesForAppointment(appointment.id);
  }

  return go(request, returnTo, {
    notice: status === "completed" ? "Marked complete." : "Marked as a no-show.",
  });
}

async function restoreCredit(request: NextRequest, user: SessionUser, form: FormData, returnTo: string) {
  const settings = await getProgramSettings();
  if (!isStaff(user)) return go(request, returnTo, { error: "Only coaches and managers can restore credits" });
  if (!settings.coachCanRestoreCredits && !isLeadOrAdmin(user)) {
    return go(request, returnTo, { error: "Only managers can restore credits" });
  }

  const appointment = await loadForStaffOrOwner(user, String(form.get("appointmentId") ?? ""));
  if (!appointment?.creditConsumed) return go(request, returnTo, { error: "No credit to restore" });

  await refundCreditIfEligible({
    householdId: appointment.client.householdId,
    appointmentId: appointment.id,
    startsAt: appointment.startsAt,
    actorId: user.id,
    force: true,
  });
  await prisma.appointment.update({ where: { id: appointment.id }, data: { creditConsumed: false } });

  return go(request, returnTo, { notice: "Credit restored." });
}
