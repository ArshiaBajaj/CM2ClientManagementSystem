import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isLeadOrAdmin } from "@/lib/access";
import { prisma } from "@/lib/db";
import { notifyUsers } from "@/lib/push";
import { audit, setFlash, temporaryPassword } from "@/lib/security";
import { hashPassword } from "@/lib/password";
import { nextInternPublicId } from "@/lib/ids";
import { answersFromForm, ensureProgramChannels, ensureTeamChannel, internClearance, internRecord } from "@/lib/gate";
import { parseFieldSpec } from "@/lib/forms";

function go(request: NextRequest, path: string, key: string, message: string) {
  const url = new URL(path, request.url);
  url.searchParams.set(key, message);
  return NextResponse.redirect(url, 303);
}

async function refreshInternStatus(internId: string) {
  const clearance = await internClearance(internId);
  await prisma.intern.update({
    where: { id: internId },
    data: { status: clearance.ready ? "active" : "pending" },
  });
  return clearance;
}

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 303);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");

  if (intent === "enroll") return enroll(request, user, form);
  if (intent === "enroll-many") return enrollMany(request, user, form);
  if (intent === "team") return createTeam(request, user, form);
  if (intent === "packet") return editPacket(request, user, form);
  if (intent === "sign") return sign(request, user, form);
  if (intent === "message") return message(request, user, form);
  if (intent === "direct") return startDirect(request, user, form);
  if (intent === "on-file") return formsOnFile(request, user, form);
  if (intent === "document") return shareDocument(request, user, form);
  if (intent === "task") return createTask(request, user, form);
  if (intent === "task-status") return moveTask(request, user, form);
  if (intent === "task-note") return noteTask(request, user, form);
  return go(request, "/interns", "error", "Unknown action");
}

type Session = NonNullable<Awaited<ReturnType<typeof getSession>>>;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** This year's intern and parent forms were signed on paper, so new interns start with them on file. */
async function recordFormsOnFile(internId: string, user: Session) {
  const packets = await prisma.accessPacket.findMany({
    where: { active: true, audience: { in: ["intern", "intern_parent"] } },
  });
  for (const packet of packets) {
    await prisma.accessCompletion.upsert({
      where: { packetId_subjectKey_signerRole: { packetId: packet.id, subjectKey: internId, signerRole: packet.audience } },
      update: {},
      create: {
        packetId: packet.id,
        subjectKey: internId,
        signerRole: packet.audience,
        signerName: `On file (signed outside the portal), recorded by ${user.name}`,
        signerUserId: user.id,
        version: packet.version,
        answersJson: JSON.stringify({ onFile: true }),
      },
    });
  }
  await refreshInternStatus(internId);
}

/** Creates one intern with a login and their forms already on file. Returns their temporary password, or why not. */
async function addIntern(
  user: Session,
  teamId: string,
  data: { firstName: string; lastName: string; email: string; parentName?: string; parentEmail?: string; parentPhone?: string },
): Promise<{ temp: string } | { error: string }> {
  const email = data.email.toLowerCase().trim();
  if (!data.firstName || !EMAIL.test(email)) return { error: "needs a name and a valid email" };
  if (await prisma.user.findUnique({ where: { email } })) return { error: "that email already has a login" };
  const intern = await prisma.intern.create({
    data: {
      publicId: await nextInternPublicId(),
      firstName: data.firstName,
      lastName: data.lastName,
      email,
      teamId,
      parentName: data.parentName ?? "",
      parentEmail: (data.parentEmail ?? "").toLowerCase(),
      parentPhone: data.parentPhone || null,
      status: "pending",
    },
  });
  const temp = temporaryPassword();
  await prisma.user.create({
    data: {
      email,
      name: `${data.firstName} ${data.lastName}`.trim(),
      password: hashPassword(temp),
      role: "intern",
      internId: intern.id,
      mustChangePassword: true,
    },
  });
  await recordFormsOnFile(intern.id, user);
  await audit("InternEnrolled", "Intern", intern.id, user.id);
  return { temp };
}

async function pickTeam(form: FormData) {
  const teamId = String(form.get("teamId") ?? "").trim();
  const newTeam = String(form.get("newTeam") ?? "").trim();
  const newFocus = String(form.get("newFocus") ?? "").trim();
  await ensureProgramChannels();
  const team = newTeam
    ? await prisma.internTeam.create({ data: { name: newTeam, focus: newFocus } })
    : teamId
      ? await prisma.internTeam.findUnique({ where: { id: teamId } })
      : null;
  if (team) await ensureTeamChannel(team.id, team.name);
  return team;
}

async function enroll(request: NextRequest, user: Session, form: FormData) {
  if (!isLeadOrAdmin(user)) return go(request, "/interns/new", "error", "Managers only");
  const firstName = String(form.get("firstName") ?? "").trim();
  const lastName = String(form.get("lastName") ?? "").trim();
  const email = String(form.get("email") ?? "").toLowerCase().trim();
  if (!firstName || !email) return go(request, "/interns/new", "error", "Add the intern's name and email");
  const team = await pickTeam(form);
  if (!team) return go(request, "/interns/new", "error", "Choose a team or type a new team name");

  const result = await addIntern(user, team.id, {
    firstName,
    lastName,
    email,
    parentName: String(form.get("parentName") ?? "").trim(),
    parentEmail: String(form.get("parentEmail") ?? "").trim(),
    parentPhone: String(form.get("parentPhone") ?? "").trim(),
  });
  if ("error" in result) return go(request, "/interns/new", "error", `Couldn't add ${firstName}: ${result.error}`);
  await setFlash(`Shown once, share it privately. Temporary password for ${email}:  ${result.temp}`);
  return go(request, "/interns", "notice", `${firstName} ${lastName} is on ${team.name} and their workspace is open.`);
}

/** Many interns at once: one per line, "Name, email". */
async function enrollMany(request: NextRequest, user: Session, form: FormData) {
  if (!isLeadOrAdmin(user)) return go(request, "/interns/new", "error", "Managers only");
  const lines = String(form.get("list") ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return go(request, "/interns/new", "error", "Paste at least one line: Name, email");
  if (lines.length > 200) return go(request, "/interns/new", "error", "Add up to 200 interns at a time");
  const team = await pickTeam(form);
  if (!team) return go(request, "/interns/new", "error", "Choose a team or type a new team name");

  const added: string[] = [];
  const skipped: string[] = [];
  for (const line of lines) {
    const parts = line.split(/[,\t;]/).map((p) => p.trim()).filter(Boolean);
    const email = parts.find((p) => EMAIL.test(p)) ?? "";
    const name = parts.filter((p) => p !== email).join(" ").trim() || email.split("@")[0];
    const [firstName, ...rest] = name.split(/\s+/);
    const result = await addIntern(user, team.id, { firstName: firstName ?? "", lastName: rest.join(" "), email });
    if ("error" in result) skipped.push(`${line} (${result.error})`);
    else added.push(`${email} · ${result.temp}`);
  }
  if (added.length) {
    await setFlash(`Shown once, share them privately. Temporary passwords:  ${added.join("  |  ")}`);
  }
  const summary = `Added ${added.length} intern${added.length === 1 ? "" : "s"} to ${team.name}.${
    skipped.length ? ` Skipped: ${skipped.join("; ")}` : ""
  }`;
  return go(request, "/interns", added.length ? "notice" : "error", summary);
}

async function createTeam(request: NextRequest, user: NonNullable<Awaited<ReturnType<typeof getSession>>>, form: FormData) {
  if (!isLeadOrAdmin(user)) return go(request, "/interns", "error", "Managers only");
  const name = String(form.get("name") ?? "").trim();
  const focus = String(form.get("focus") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  if (!name) return go(request, "/interns", "error", "Team name is required");
  const team = await prisma.internTeam.create({ data: { name, focus, description } });
  await ensureTeamChannel(team.id, team.name);
  await ensureProgramChannels();
  return go(request, "/interns", "notice", `${name} is ready for interns`);
}

async function editPacket(request: NextRequest, user: NonNullable<Awaited<ReturnType<typeof getSession>>>, form: FormData) {
  if (!isLeadOrAdmin(user)) return go(request, "/interns", "error", "Managers only");
  const id = String(form.get("packetId") ?? "");
  const packet = await prisma.accessPacket.findUnique({ where: { id } });
  if (!packet) return go(request, "/interns", "error", "Form not found");
  const title = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const body = String(form.get("body") ?? "").trim();
  const spec = String(form.get("spec") ?? "");
  if (!title) return go(request, "/interns", "error", "Title is required");

  let schemaJson = packet.schemaJson;
  if (packet.kind === "form") {
    const parsed = parseFieldSpec(spec);
    if (parsed.errors.length) return go(request, "/interns", "error", parsed.errors[0]);
    schemaJson = JSON.stringify(parsed.fields);
  } else if (!body) {
    return go(request, "/interns", "error", "The agreement text is required");
  }

  const changed = title !== packet.title || description !== packet.description || body !== packet.body || schemaJson !== packet.schemaJson;
  await prisma.accessPacket.update({
    where: { id },
    data: {
      title,
      description,
      body: packet.kind === "signature" ? body : packet.body,
      schemaJson,
      version: changed ? new Date().toISOString().slice(0, 10) : packet.version,
      active: String(form.get("active") ?? "") === "1",
    },
  });
  return go(request, "/interns", "notice", changed ? "Saved. People will be asked to sign this version." : "Saved");
}

async function sign(request: NextRequest, user: NonNullable<Awaited<ReturnType<typeof getSession>>>, form: FormData) {
  const internId = String(form.get("internId") ?? "");
  const intern = await prisma.intern.findUnique({ where: { id: internId } });
  if (!intern) return go(request, "/intern/start", "error", "Intern not found");

  const audience = user.role === "intern" ? "intern" : user.role === "intern_parent" ? "intern_parent" : null;
  if (!audience) return go(request, "/workspace", "error", "Only interns and parents sign these forms");
  if (audience === "intern") {
    const mine = await internRecord(user);
    if (!mine || mine.id !== intern.id) return go(request, "/intern/start", "error", "This form is for a different intern");
  }
  if (audience === "intern_parent" && intern.parentEmail !== user.email) {
    return go(request, "/intern/start", "error", "This form is for a different parent");
  }

  const packet = await prisma.accessPacket.findUnique({ where: { id: String(form.get("packetId") ?? "") } });
  if (!packet || !packet.active || packet.audience !== audience) return go(request, "/intern/start", "error", "Form not found");

  const agreed = String(form.get("agree") ?? "") === "1";
  const signature = String(form.get("signature") ?? "").trim();
  if (!agreed) return go(request, "/intern/start", "error", "Tick the box to confirm");
  if (signature.length < 3) return go(request, "/intern/start", "error", "Type your full name to sign");

  let answers: Record<string, string> = {};
  if (packet.kind === "form") {
    const parsed = answersFromForm(packet.schemaJson, form);
    if (parsed.error) return go(request, "/intern/start", "error", parsed.error);
    answers = parsed.answers;
  }

  await prisma.accessCompletion.upsert({
    where: { packetId_subjectKey_signerRole: { packetId: packet.id, subjectKey: intern.id, signerRole: audience } },
    update: { signerName: signature, signerUserId: user.id, answersJson: JSON.stringify(answers), version: packet.version, completedAt: new Date() },
    create: {
      packetId: packet.id,
      subjectKey: intern.id,
      signerRole: audience,
      signerName: signature,
      signerUserId: user.id,
      answersJson: JSON.stringify(answers),
      version: packet.version,
    },
  });
  const clearance = await refreshInternStatus(intern.id);
  const note = clearance.ready
    ? audience === "intern"
      ? `${packet.title} signed. Your intern workspace is open.`
      : `${packet.title} signed. ${intern.firstName} can use the intern workspace.`
    : `${packet.title} signed.`;
  return go(request, "/intern/start", "notice", note);
}

async function message(request: NextRequest, user: NonNullable<Awaited<ReturnType<typeof getSession>>>, form: FormData) {
  const returnTo = String(form.get("returnTo") ?? "/intern/chat");
  const safeReturn = returnTo.startsWith("/intern") ? returnTo : "/intern/chat";
  const channel = await prisma.internChannel.findUnique({ where: { id: String(form.get("channelId") ?? "") } });
  const body = String(form.get("body") ?? "").trim();
  if (!channel || !body) return go(request, safeReturn, "error", "Write a message first");

  if (isLeadOrAdmin(user)) {
    // Managers can supervise every intern channel.
  } else if (user.role === "intern") {
    const intern = await internRecord(user);
    if (!intern || !(await internClearance(intern.id)).ready) return go(request, "/intern/start", "error", "Finish the forms first");
    const allowed =
      channel.kind === "all" ||
      channel.kind === "between" ||
      (channel.kind === "direct" ? channel.memberIds.split(",").includes(intern.id) : channel.teamId === intern.teamId);
    if (!allowed) return go(request, "/intern/chat", "error", "That channel is for another team");
  } else {
    return go(request, "/workspace", "error", "Intern chat is for interns");
  }

  await prisma.internMessage.create({
    data: { channelId: channel.id, senderId: user.id, senderName: user.name, body: body.slice(0, 2000) },
  });
  // Notify the interns who can read this channel (not managers, to keep it quiet for them).
  const readers = await prisma.intern.findMany({
    where:
      channel.kind === "direct"
        ? { id: { in: channel.memberIds.split(",") } }
        : channel.kind === "team"
          ? { teamId: channel.teamId ?? "" }
          : { status: "active" },
    select: { user: { select: { id: true } } },
  });
  await notifyUsers(
    readers.map((r) => r.user?.id ?? "").filter((id) => id && id !== user.id),
    {
      title: channel.kind === "direct" ? `Message from ${user.name.split(" ")[0]}` : channel.name,
      body: channel.kind === "direct" ? "Open intern chat to reply." : `${user.name.split(" ")[0]} posted in ${channel.name}.`,
      url: `/intern/chat?channel=${channel.key}`,
      tag: `intern-${channel.key}`,
    },
  );
  const url = new URL(safeReturn, request.url);
  url.searchParams.set("channel", channel.key);
  url.searchParams.set("notice", "Message sent");
  return NextResponse.redirect(url, 303);
}

/**
 * For interns whose forms were already signed this year outside the portal (paper or another system):
 * a manager records them as on file, which opens the intern workspace without signing again.
 * Each record notes who marked it and when, for the audit trail.
 */
async function formsOnFile(request: NextRequest, user: Session, form: FormData) {
  if (!isLeadOrAdmin(user)) return go(request, "/intern", "error", "Only program managers can do that");
  const all = String(form.get("internId") ?? "") === "all";
  const interns = await prisma.intern.findMany({ where: all ? {} : { id: String(form.get("internId") ?? "") } });
  if (interns.length === 0) return go(request, "/interns", "error", "Intern not found");
  for (const intern of interns) {
    await recordFormsOnFile(intern.id, user);
    await audit("InternFormsOnFile", "Intern", intern.id, user.id);
  }
  return go(
    request,
    "/interns",
    "notice",
    all ? `Forms marked on file for all ${interns.length} interns. Their workspaces are open.` : `${interns[0].firstName}'s forms are on file. Their workspace is open.`,
  );
}

/** Opens (or creates) a one-on-one conversation between two cleared interns. */
async function startDirect(request: NextRequest, user: NonNullable<Awaited<ReturnType<typeof getSession>>>, form: FormData) {
  if (user.role !== "intern") return go(request, "/interns/chat", "error", "Direct messages are between interns");
  const me = await internRecord(user);
  if (!me || !(await internClearance(me.id)).ready) return go(request, "/intern/start", "error", "Finish the forms first");
  const other = await prisma.intern.findUnique({ where: { id: String(form.get("internId") ?? "") } });
  if (!other || other.id === me.id) return go(request, "/intern/chat", "error", "Pick another intern to message");
  if (!(await internClearance(other.id)).ready) {
    return go(request, "/intern/chat", "error", `${other.firstName} can chat once their forms are signed`);
  }
  const ids = [me.id, other.id].sort();
  const key = `dm-${ids.join("-")}`;
  await prisma.internChannel.upsert({
    where: { key },
    update: {},
    create: {
      key,
      kind: "direct",
      name: [me, other].map((i) => `${i.firstName} ${i.lastName.slice(0, 1)}.`).sort().join(" & "),
      memberIds: ids.join(","),
    },
  });
  const url = new URL("/intern/chat", request.url);
  url.searchParams.set("channel", key);
  return NextResponse.redirect(url, 303);
}

async function shareDocument(request: NextRequest, user: NonNullable<Awaited<ReturnType<typeof getSession>>>, form: FormData) {
  const title = String(form.get("title") ?? "").trim();
  const body = String(form.get("body") ?? "").trim();
  const audience = String(form.get("audience") ?? "team");
  if (!title || !body) return go(request, "/intern/documents", "error", "Title and document are required");

  let teamId: string | null = null;
  if (isLeadOrAdmin(user)) {
    if (audience !== "all") {
      const team = await prisma.internTeam.findUnique({ where: { id: audience } });
      if (!team) return go(request, "/intern/documents", "error", "Choose who can read this");
      teamId = team.id;
    }
  } else if (user.role === "intern") {
    const intern = await internRecord(user);
    if (!intern || !(await internClearance(intern.id)).ready) return go(request, "/intern/start", "error", "Finish the forms first");
    teamId = audience === "all" ? null : intern.teamId;
  } else {
    return go(request, "/workspace", "error", "Interns share these documents");
  }

  await prisma.internDocument.create({
    data: { title: title.slice(0, 140), body: body.slice(0, 8000), teamId, authorId: user.id, authorName: user.name },
  });
  return go(request, "/intern/documents", "notice", "Document shared");
}

const TASK_STATUSES = new Set(["todo", "doing", "done"]);

async function taskActor(user: NonNullable<Awaited<ReturnType<typeof getSession>>>) {
  if (isLeadOrAdmin(user)) return { manager: true as const, intern: null };
  if (user.role !== "intern") return null;
  const intern = await internRecord(user);
  if (!intern || !(await internClearance(intern.id)).ready) return { manager: false as const, intern: null, closed: true as const };
  return { manager: false as const, intern, closed: false as const };
}

async function loadVisibleTask(id: string, actor: NonNullable<Awaited<ReturnType<typeof taskActor>>>) {
  const task = await prisma.internTask.findUnique({ where: { id }, include: { assignee: true } });
  if (!task) return null;
  if (actor.manager) return task;
  if (!actor.intern) return null;
  if (task.teamId && task.teamId !== actor.intern.teamId) return null;
  return task;
}

function taskBack(id: string) {
  return `/intern/tasks?task=${id}`;
}

async function createTask(request: NextRequest, user: NonNullable<Awaited<ReturnType<typeof getSession>>>, form: FormData) {
  const actor = await taskActor(user);
  if (!actor) return go(request, "/workspace", "error", "Tasks are for interns");
  if ("closed" in actor && actor.closed) return go(request, "/intern/start", "error", "Finish the forms first");

  const title = String(form.get("title") ?? "").trim();
  const detail = String(form.get("detail") ?? "").trim();
  const audience = String(form.get("audience") ?? "team");
  const assigneeId = String(form.get("assigneeId") ?? "").trim();
  const dueOn = String(form.get("dueOn") ?? "").trim();
  if (!title) return go(request, "/intern/tasks", "error", "Give the task a title");
  if (dueOn && !/^\d{4}-\d{2}-\d{2}$/.test(dueOn)) return go(request, "/intern/tasks", "error", "Use a real due date");

  let teamId: string | null = null;
  if (audience !== "all") {
    if (actor.manager) {
      const team = await prisma.internTeam.findUnique({ where: { id: audience } });
      if (!team) return go(request, "/intern/tasks", "error", "Choose a team or all interns");
      teamId = team.id;
    } else {
      teamId = actor.intern!.teamId;
    }
  }

  if (assigneeId) {
    const assignee = await prisma.intern.findUnique({ where: { id: assigneeId } });
    if (!assignee) return go(request, "/intern/tasks", "error", "That intern is not on the roster");
    if (teamId && assignee.teamId !== teamId) {
      return go(request, "/intern/tasks", "error", "Assign a team task to someone on that team");
    }
  }

  const task = await prisma.internTask.create({
    data: {
      title: title.slice(0, 140),
      detail: detail.slice(0, 4000),
      teamId,
      assigneeId: assigneeId || null,
      authorId: user.id,
      authorName: user.name,
      dueOn,
    },
  });
  return go(request, taskBack(task.id), "notice", "Task added");
}

async function moveTask(request: NextRequest, user: NonNullable<Awaited<ReturnType<typeof getSession>>>, form: FormData) {
  const actor = await taskActor(user);
  if (!actor) return go(request, "/workspace", "error", "Tasks are for interns");
  if ("closed" in actor && actor.closed) return go(request, "/intern/start", "error", "Finish the forms first");
  const status = String(form.get("status") ?? "");
  if (!TASK_STATUSES.has(status)) return go(request, "/intern/tasks", "error", "Choose To do, Doing, or Done");
  const task = await loadVisibleTask(String(form.get("taskId") ?? ""), actor);
  if (!task) return go(request, "/intern/tasks", "error", "That task is not on your board");
  await prisma.internTask.update({ where: { id: task.id }, data: { status } });
  const label = status === "doing" ? "Marked as doing" : status === "done" ? "Marked done" : "Moved back to to do";
  return go(request, taskBack(task.id), "notice", label);
}

async function noteTask(request: NextRequest, user: NonNullable<Awaited<ReturnType<typeof getSession>>>, form: FormData) {
  const actor = await taskActor(user);
  if (!actor) return go(request, "/workspace", "error", "Tasks are for interns");
  if ("closed" in actor && actor.closed) return go(request, "/intern/start", "error", "Finish the forms first");
  const body = String(form.get("body") ?? "").trim();
  const task = await loadVisibleTask(String(form.get("taskId") ?? ""), actor);
  if (!task) return go(request, "/intern/tasks", "error", "That task is not on your board");
  if (!body) return go(request, taskBack(task.id), "error", "Write a note first");
  await prisma.internTaskNote.create({
    data: { taskId: task.id, authorId: user.id, authorName: user.name, body: body.slice(0, 2000) },
  });
  return go(request, taskBack(task.id), "notice", "Note added");
}
