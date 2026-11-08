import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canAccessClient, isLeadOrAdmin, isStaff } from "@/lib/access";
import { denyClosed } from "@/lib/gate";
import { prisma } from "@/lib/db";
import { getPermissions } from "@/lib/settings";

const MAX_PHOTO_BYTES = 750_000;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 303);
  const closed = await denyClosed(user, request);
  if (closed) return closed;

  const form = await request.formData();
  const intent = String(form.get("intent") ?? "").trim();
  const clientId = String(form.get("clientId") ?? "").trim();
  const staff = isStaff(user);
  const self = user.role === "client" && user.clientId === clientId;
  const home = staff ? `/clients/${clientId}` : "/workspace";

  const go = (key: "notice" | "error", message: string, path = home) =>
    NextResponse.redirect(new URL(`${path}?${key}=${encodeURIComponent(message)}`, request.url), 303);

  const access = await canAccessClient(user, clientId);
  if (!access.ok || !access.client || (!staff && !self)) {
    return NextResponse.redirect(new URL("/workspace?error=Access%20denied", request.url), 303);
  }

  if (intent === "photo") {
    const file = form.get("photo");
    if (!(file instanceof File) || file.size === 0) return go("error", "Choose a photo");
    if (!PHOTO_TYPES.includes(file.type)) return go("error", "Use a JPG, PNG, or WebP image");
    if (file.size > MAX_PHOTO_BYTES) return go("error", "Photo must be under 750 KB");
    const data = Buffer.from(await file.arrayBuffer()).toString("base64");
    await prisma.client.update({
      where: { id: clientId },
      data: { avatarUrl: `data:${file.type};base64,${data}` },
    });
    return go("notice", "Photo updated");
  }

  if (intent === "ai_opt_out") {
    const optOut = String(form.get("optOut") ?? "") === "1";
    await prisma.client.update({ where: { id: clientId }, data: { aiScribeOptOut: optOut } });
    await prisma.appointment.updateMany({
      where: { clientId, status: "scheduled" },
      data: { aiScribeEnabled: !optOut },
    });
    return go("notice", optOut ? "AI scribe turned off for future sessions" : "AI scribe turned on");
  }

  if (!staff) return go("error", "Only coaches and managers can do that");

  if (intent === "archive" || intent === "unarchive") {
    const permissions = await getPermissions();
    if (!isLeadOrAdmin(user) && !permissions.coachesCanArchive) {
      return go("error", "Only managers can archive students");
    }
    const archiving = intent === "archive";
    await prisma.client.update({
      where: { id: clientId },
      data: { archivedAt: archiving ? new Date() : null, status: archiving ? "archived" : "enrolled" },
    });
    if (archiving) {
      await prisma.conversation.updateMany({
        where: { clientId, status: "active" },
        data: { status: "archived", archivedAt: new Date() },
      });
    }
    await prisma.auditEvent.create({
      data: {
        actorId: user.id,
        action: archiving ? "ClientArchived" : "ClientUnarchived",
        entity: "Client",
        entityId: clientId,
        metadata: "{}",
      },
    });
    return archiving
      ? go("notice", `${access.client.firstName} archived. Their records are kept.`, "/clients")
      : go("notice", "Student restored");
  }

  if (intent === "quick_note") {
    const body = String(form.get("body") ?? "").trim();
    if (!body) return go("error", "Write a note first");
    await prisma.note.create({
      data: { clientId, authorId: user.id, authorName: user.name, body, visibility: "coach_only" },
    });
    return go("notice", "Quick note saved");
  }

  if (intent === "delete_note") {
    await prisma.note.deleteMany({
      where: { id: String(form.get("noteId") ?? ""), clientId, ...(isLeadOrAdmin(user) ? {} : { authorId: user.id }) },
    });
    return go("notice", "Note removed");
  }

  if (intent === "profile") {
    await prisma.client.update({
      where: { id: clientId },
      data: {
        email: String(form.get("email") ?? "").trim().toLowerCase() || null,
        phone: String(form.get("phone") ?? "").trim() || null,
        location: String(form.get("location") ?? "").trim() || null,
        group: String(form.get("group") ?? "").trim() || null,
        timezone: String(form.get("timezone") ?? access.client.timezone),
        interests: form.getAll("interests").map(String).join(", "),
        preferredTimes: form.getAll("preferredTimes").map(String).join(","),
      },
    });
    return go("notice", "Profile saved");
  }

  if (intent === "add_task") {
    const title = String(form.get("title") ?? "").trim();
    if (!title) return go("error", "Task needs a title");
    await prisma.clientTask.create({
      data: { clientId, title, dueDate: String(form.get("dueDate") ?? "") || null, createdById: user.id },
    });
    return go("notice", "Task added");
  }

  if (intent === "toggle_task") {
    const task = await prisma.clientTask.findFirst({ where: { id: String(form.get("taskId") ?? ""), clientId } });
    if (task) await prisma.clientTask.update({ where: { id: task.id }, data: { done: !task.done } });
    return go("notice", task?.done ? "Task reopened" : "Task done");
  }

  if (intent === "guardian") {
    const guardianId = String(form.get("guardianId") ?? "");
    const guardian = await prisma.guardian.findFirst({
      where: { id: guardianId, householdId: access.client.householdId },
    });
    if (!guardian) return go("error", "Parent not found");
    await prisma.guardian.update({
      where: { id: guardian.id },
      data: {
        receivesNotifications: String(form.get("receivesNotifications") ?? "") === "1",
        isEmergencyContact: String(form.get("isEmergencyContact") ?? "") === "1",
      },
    });
    return go("notice", `${guardian.name}'s contact settings saved`);
  }

  return go("error", "Unknown action");
}
