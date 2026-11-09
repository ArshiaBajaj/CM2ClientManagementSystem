import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isLeadOrAdmin } from "@/lib/access";
import { prisma } from "@/lib/db";
import { PERMISSIONS, getProgramSettings } from "@/lib/settings";
import { RELEASE_ANCHORS } from "@/lib/releases";
import { hashPassword } from "@/lib/password";
import { DEMO_EMAILS, audit, setFlash, temporaryPassword } from "@/lib/security";
import { startFresh } from "@/lib/start-fresh";
import { ensureProgramChannels } from "@/lib/gate";

function back(request: NextRequest, section: string, key: "notice" | "error", message: string) {
  return NextResponse.redirect(
    new URL(`/settings?${key}=${encodeURIComponent(message)}#${section}`, request.url),
    303,
  );
}

function url(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text && !/^https?:\/\//.test(text) ? `https://${text}` : text;
}

const KINDS = ["first", "follow_up", "final", "check_in"];
const TIMINGS = ["immediate", "none"];

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user || !isLeadOrAdmin(user)) return NextResponse.redirect(new URL("/login", request.url), 303);

  await getProgramSettings();
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "program").trim();
  const on = (name: string) => String(form.get(name) ?? "") === "1";

  if (intent === "start_fresh") {
    if (user.role !== "admin") return back(request, "fresh", "error", "Only an admin can start fresh");
    if (DEMO_EMAILS.has(user.email)) return back(request, "fresh", "error", "Sign in with your own manager account first");
    if (String(form.get("confirm") ?? "").trim().toUpperCase() !== "START FRESH") {
      return back(request, "fresh", "error", "Type START FRESH to confirm");
    }
    await startFresh(user.id);
    await ensureProgramChannels();
    await audit("StartedFresh", "Program", "all", user.id);
    return back(request, "team", "notice", "Done. The portal is empty and ready. Add your coaches here, then interns and clients.");
  }

  if (intent === "temp_password") {
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const target = await prisma.user.findUnique({ where: { email } });
    if (!target) return back(request, "signin", "error", "No account uses that email");
    // Managers can't reset another manager or admin from here.
    if ((target.role === "admin" || target.role === "team_lead") && target.id !== user.id && user.role !== "admin") {
      return back(request, "signin", "error", "Only an admin can reset a manager's password");
    }
    const temp = temporaryPassword();
    await prisma.user.update({ where: { id: target.id }, data: { password: hashPassword(temp), mustChangePassword: true } });
    await prisma.auditEvent.deleteMany({ where: { action: "LoginFailed", entityId: email } });
    await audit("TemporaryPasswordIssued", "User", target.id, user.id);
    await setFlash(`Shown once, share it privately. They pick their own at sign-in. Temporary password for ${email}:  ${temp}`);
    return back(request, "signin", "notice", "Temporary password created");
  }

  // Team accounts: managers create real manager and coach logins (each with a one-time temporary password).
  if (intent === "team_account") {
    const name = String(form.get("name") ?? "").trim().slice(0, 120);
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const role = String(form.get("role") ?? "");
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return back(request, "team", "error", "Add a name and a valid email");
    if (role !== "coach" && role !== "team_lead" && role !== "admin") return back(request, "team", "error", "Pick a role");
    if (role === "admin" && user.role !== "admin") return back(request, "team", "error", "Only an admin can create another admin");
    if (await prisma.user.findUnique({ where: { email } })) {
      return back(request, "team", "error", "That email already has an account. Use Sign-in help to give it a new password.");
    }
    const temp = temporaryPassword();
    let coachId: string | null = null;
    if (role === "coach") {
      coachId = `coach-${crypto.randomUUID().slice(0, 8)}`;
      await prisma.coachRoster.create({
        data: {
          coachId,
          email,
          name,
          status: "active",
          programRoles: "coach",
          effectiveAt: new Date(),
          sourceEventId: `manual-${coachId}`,
        },
      });
    }
    const created = await prisma.user.create({
      data: { email, name, role, coachId, password: hashPassword(temp), mustChangePassword: true },
    });
    await audit("TeamAccountCreated", "User", created.id, user.id, { role });
    await setFlash(
      `${name} can sign in as ${role === "coach" ? "a coach" : role === "admin" ? "an admin" : "a manager"} with ${email}.${role === "coach" ? " They sign their coach forms before students open." : ""} Shown once, share it privately. Temporary password:  ${temp}`,
    );
    return back(request, "team", "notice", "Account created");
  }

  if (intent === "appointment_type") {
    const id = String(form.get("id") ?? "").trim();
    const name = String(form.get("name") ?? "").trim();
    if (!name) return back(request, "types", "error", "Appointment type needs a name");
    const duration = Number(form.get("durationMinutes") ?? 45);
    const kind = String(form.get("kind") ?? "follow_up");
    const timing = String(form.get("confirmationTiming") ?? "immediate");
    const data = {
      name,
      durationMinutes: Number.isFinite(duration) ? Math.min(180, Math.max(15, duration)) : 45,
      meetingProvider: String(form.get("meetingProvider") ?? "zoom_hipaa"),
      aiScribeInstructions: String(form.get("aiScribeInstructions") ?? ""),
      confirmationEmailBody: String(form.get("confirmationEmailBody") ?? ""),
      kind: KINDS.includes(kind) ? kind : "follow_up",
      clientCanBook: on("clientCanBook"),
      isVideo: on("isVideo"),
      active: on("active"),
      scribeFormKey: String(form.get("scribeFormKey") ?? "") || null,
      confirmationTiming: TIMINGS.includes(timing) ? timing : "immediate",
    };
    if (id) await prisma.appointmentType.update({ where: { id }, data });
    else await prisma.appointmentType.create({ data });
    return back(request, "types", "notice", `${name} saved`);
  }

  if (intent === "release_rule") {
    const templateKey = String(form.get("templateKey") ?? "");
    const anchor = String(form.get("anchor") ?? "");
    const amount = Math.max(0, Number(form.get("offsetAmount") ?? 0) || 0);
    const unit = String(form.get("offsetUnit") ?? "hours");
    const multiplier = unit === "days" ? 1440 : unit === "minutes" ? 1 : 60;
    if (!(await prisma.formTemplate.findUnique({ where: { key: templateKey } }))) {
      return back(request, "releases", "error", "Choose a form");
    }
    if (!(anchor in RELEASE_ANCHORS)) return back(request, "releases", "error", "Choose when to send it");
    await prisma.formReleaseRule.create({
      data: {
        templateKey,
        anchor,
        offsetMinutes: Math.round(amount * multiplier),
        appointmentKind: String(form.get("appointmentKind") ?? "any"),
        firstOnly: on("firstOnly"),
      },
    });
    return back(request, "releases", "notice", "Automatic release added");
  }

  if (intent === "release_rule_toggle") {
    const rule = await prisma.formReleaseRule.findUnique({ where: { id: String(form.get("id") ?? "") } });
    if (rule) await prisma.formReleaseRule.update({ where: { id: rule.id }, data: { active: !rule.active } });
    return back(request, "releases", "notice", rule?.active ? "Paused" : "Turned on");
  }

  if (intent === "release_rule_delete") {
    await prisma.formReleaseRule.deleteMany({ where: { id: String(form.get("id") ?? "") } });
    return back(request, "releases", "notice", "Removed");
  }

  if (intent === "permissions") {
    const permissions = Object.fromEntries(Object.keys(PERMISSIONS).map((key) => [key, on(key)]));
    await prisma.programSettings.update({
      where: { id: "default" },
      data: { rolePermissionsJson: JSON.stringify(permissions) },
    });
    return back(request, "access", "notice", "Access settings saved");
  }

  if (intent === "email") {
    await prisma.programSettings.update({
      where: { id: "default" },
      data: {
        confirmationEmailSubject: String(form.get("confirmationEmailSubject") ?? "").trim() || "Your Coach Me 2 appointment is confirmed",
        confirmationEmailBody: String(form.get("confirmationEmailBody") ?? ""),
      },
    });
    return back(request, "email", "notice", "Confirmation email saved");
  }

  const policy = String(form.get("cancelPolicy") ?? "window");
  const hours = Number(form.get("cancelRefundHours") ?? 24);
  await prisma.programSettings.update({
    where: { id: "default" },
    data: {
      creditsEnabled: on("creditsEnabled"),
      cancelPolicy: ["window", "always_refund", "never_refund"].includes(policy) ? policy : "window",
      cancelRefundHours: Number.isFinite(hours) ? Math.min(168, Math.max(1, hours)) : 24,
      coachCanRestoreCredits: on("coachCanRestoreCredits"),
      managerSeesAllCalendars: on("managerSeesAllCalendars"),
      notesTakenNotice: on("notesTakenNotice"),
      defaultMeetingProvider: String(form.get("defaultMeetingProvider") ?? "zoom_hipaa"),
      googleCalendarLinked: on("googleCalendarLinked"),
      outlookCalendarLinked: on("outlookCalendarLinked"),
      websiteUrl: url(form.get("websiteUrl")),
      podcastUrl: url(form.get("podcastUrl")),
      researchUrl: url(form.get("researchUrl")),
    },
  });
  return back(request, "program", "notice", "Program settings saved");
}
