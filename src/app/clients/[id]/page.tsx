import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canAccessClient, isLeadOrAdmin, noteVisibleTo } from "@/lib/access";
import { guardClientWorkspace } from "@/lib/gate";
import { prisma } from "@/lib/db";
import { Notice, Shell } from "@/components/shell";
import { Avatar } from "@/components/avatar";
import { ensureWallet } from "@/lib/credits";
import { documentStatusFor } from "@/lib/documents";
import { FOCUS_AREAS, TIME_WINDOWS, splitList } from "@/lib/matching";
import { TIMEZONES, localTimeIn, timezoneLabel } from "@/lib/timezones";
import { getPermissions } from "@/lib/settings";

const ENGAGEMENT_LABELS: Record<string, string> = {
  engaged: "Engaged",
  somewhat: "Somewhat engaged",
  not_yet: "Not engaged yet",
};

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; notice?: string; appts?: string }>;
}) {
  const user = await getSession();
  if (!user) redirect("/login");
  await guardClientWorkspace(user);
  if (user.role === "guardian") redirect("/workspace?error=Student%20pages%20are%20confidential");
  if (user.role === "client") redirect("/workspace");

  const { id } = await params;
  const { error, notice, appts } = await searchParams;
  const access = await canAccessClient(user, id);
  if (!access.ok) redirect("/clients?error=That%20student%20is%20not%20assigned%20to%20you");

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      household: { include: { guardians: true, creditWallet: true } },
      goals: { where: { status: "active" }, orderBy: { createdAt: "desc" } },
      notes: { orderBy: { createdAt: "desc" } },
      tasks: { orderBy: [{ done: "asc" }, { createdAt: "desc" }] },
      appointments: { orderBy: { startsAt: "desc" }, include: { coach: true, appointmentType: true } },
      assignments: { where: { status: "active" }, include: { coach: true, sessionAllowance: true } },
      progressReports: { orderBy: { createdAt: "desc" }, take: 5 },
      formSubmissions: { orderBy: { createdAt: "desc" }, include: { template: true }, take: 6 },
    },
  });
  if (!client) notFound();

  const manager = isLeadOrAdmin(user);
  const permissions = await getPermissions();
  const coachUserIds = manager
    ? []
    : (await prisma.user.findMany({ where: { role: "coach", id: { not: user.id } }, select: { id: true } })).map((u) => u.id);
  const notes = client.notes.filter(
    (note) => noteVisibleTo(user, note.visibility) && !coachUserIds.includes(note.authorId),
  );

  const assignment = client.assignments[0];
  const wallet = client.household.creditWallet ?? (await ensureWallet(client.householdId));
  const documents = await documentStatusFor(client.id);
  const clientUser = await prisma.user.findFirst({ where: { clientId: client.id } });
  const lastActive = clientUser?.lastLoginAt ?? client.lastActiveAt;
  const openRequest = client.progressReports.find((r) => r.status === "requested");
  const now = Date.now();
  const apptTab = appts ?? "upcoming";
  const apptList = client.appointments.filter((a) =>
    apptTab === "past"
      ? a.status === "completed" || a.status === "cancelled"
      : apptTab === "no_show"
        ? a.status === "no_show"
        : a.status === "scheduled",
  );
  const upcoming = client.appointments
    .filter((a) => a.status === "scheduled" && a.startsAt.getTime() > now)
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const meetingUrl = upcoming[0]?.meetingUrl ?? `https://zoom.us/j/cm2-${client.publicId.replace("CM2-", "")}`;
  const interests = new Set(splitList(client.interests));
  const times = new Set(splitList(client.preferredTimes));
  const returnTo = `/clients/${client.id}`;

  return (
    <Shell user={user}>
      <p className="text-sm">
        <Link href="/clients" className="link-accent">
          ← Clients
        </Link>
      </p>

      <header className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar url={client.avatarUrl} initials={`${client.firstName[0]}${client.lastName[0]}`} size="lg" />
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              {client.firstName} {client.lastName}
            </h1>
            <p className="mt-1 text-sm text-ink/55">
              <span className="font-mono">{client.publicId}</span>
              {client.group ? ` · ${client.group}` : ""}
              {client.archivedAt ? " · Archived (records kept)" : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/chat/open?clientId=${client.id}`} className="btn-secondary">
            Chat
          </Link>
          <a href={meetingUrl} target="_blank" rel="noreferrer" className="btn-secondary">
            Video call
          </a>
          {!client.archivedAt ? (
            <Link href={`/calendar?tab=upcoming&clientId=${client.id}`} className="btn">
              Book session
            </Link>
          ) : null}
        </div>
      </header>
      <Notice error={error} notice={notice} />

      <div className="mt-8 grid gap-6 lg:grid-cols-[300px_1fr]">
        <aside className="space-y-4">
          <section className="panel rounded-xl p-5 text-sm">
            <h2 className="label-caps">About</h2>
            <dl className="mt-3 space-y-2">
              <Row label="Coach" value={assignment?.coach.name ?? "Not matched yet"} />
              <Row label="Email" value={client.email ?? "—"} />
              <Row label="Phone" value={client.phone ?? "—"} />
              <Row label="Location" value={client.location ?? "—"} />
              <Row label="Time zone" value={`${timezoneLabel(client.timezone)} (${localTimeIn(client.timezone)} now)`} />
              <Row label="Born" value={client.dateOfBirth} />
              <Row label="Client since" value={client.createdAt.toLocaleDateString()} />
              <Row label="Last active" value={lastActive ? lastActive.toLocaleDateString() : "Not yet"} />
              <Row label="Credits left" value={String(wallet.balance)} />
              {assignment?.sessionAllowance ? (
                <Row
                  label="Sessions"
                  value={`${assignment.sessionAllowance.used} of ${assignment.sessionAllowance.allowed} done`}
                />
              ) : null}
            </dl>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-ink/[0.08] pt-3">
              <Link href={`/journal?clientId=${client.id}`} className="link-accent">
                Journal
              </Link>
              <Link href={`/goals?clientId=${client.id}`} className="link-accent">
                Goals
              </Link>
              <Link href={`/metrics?clientId=${client.id}`} className="link-accent">
                Metrics
              </Link>
            </div>
          </section>

          <section className="panel rounded-xl p-5 text-sm">
            <h2 className="label-caps">Parents</h2>
            {client.household.guardians.length === 0 ? (
              <p className="mt-3 text-ink/55">No parent on file.</p>
            ) : null}
            {client.household.guardians.map((g) => (
              <form key={g.id} action="/api/clients/actions" method="post" className="mt-3 space-y-1.5 border-t border-ink/[0.06] pt-3 first-of-type:border-0 first-of-type:pt-0">
                <input type="hidden" name="intent" value="guardian" />
                <input type="hidden" name="clientId" value={client.id} />
                <input type="hidden" name="guardianId" value={g.id} />
                <p className="font-medium">
                  {g.name} <span className="font-normal text-ink/50">· {g.relationship}</span>
                </p>
                <p className="text-ink/60">{g.phone ?? "No phone"}</p>
                <p className="text-ink/60">{g.email}</p>
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" name="isEmergencyContact" value="1" defaultChecked={g.isEmergencyContact} />
                  Emergency contact
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" name="receivesNotifications" value="1" defaultChecked={g.receivesNotifications} />
                  Also gets appointment emails
                </label>
                <button className="btn-ghost -ml-3 text-xs">Save</button>
              </form>
            ))}
            <p className="mt-3 text-xs text-ink/50">
              Parents never see this page, notes, journals, chat, or forms.
            </p>
          </section>

          <section className="panel rounded-xl p-5 text-sm">
            <h2 className="label-caps">AI scribe</h2>
            <p className="mt-2 text-ink/65">
              {!permissions.aiScribeEnabled
                ? "Turned off for the whole program."
                : client.aiScribeOptOut
                  ? "Off for this student. Sessions will not be transcribed."
                  : documents.find((d) => d.key === "ai_scribe_consent")?.signed.client
                    ? "On. The student signed the AI consent."
                    : "On. AI consent has not been signed yet."}
            </p>
            <form action="/api/clients/actions" method="post" className="mt-2">
              <input type="hidden" name="intent" value="ai_opt_out" />
              <input type="hidden" name="clientId" value={client.id} />
              <input type="hidden" name="optOut" value={client.aiScribeOptOut ? "0" : "1"} />
              <button className="btn-ghost -ml-3 text-xs">
                {client.aiScribeOptOut ? "Turn the AI scribe back on" : "Turn off the AI scribe for this student"}
              </button>
            </form>
          </section>

          {manager || permissions.coachesCanArchive ? (
            <form action="/api/clients/actions" method="post">
              <input type="hidden" name="clientId" value={client.id} />
              <input type="hidden" name="intent" value={client.archivedAt ? "unarchive" : "archive"} />
              <button className="btn-secondary w-full">
                {client.archivedAt ? "Restore student" : "Archive student (keeps all records)"}
              </button>
            </form>
          ) : null}
        </aside>

        <div className="min-w-0 space-y-6">
          <div className="grid gap-6 xl:grid-cols-2">
            <section className="panel rounded-xl p-5">
              <h2 className="font-display text-xl font-semibold tracking-tight">Quick notes</h2>
              <p className="text-xs text-ink/50">Private to coaches and managers.</p>
              <ul className="mt-3 space-y-2">
                {notes.length === 0 ? <li className="text-sm text-ink/55">No notes yet.</li> : null}
                {notes.slice(0, 6).map((note) => (
                  <li key={note.id} className="group rounded-lg bg-amber-50 px-3 py-2.5 text-sm">
                    <p>{note.body}</p>
                    <div className="mt-1 flex items-center justify-between text-xs text-ink/45">
                      <span>
                        {note.authorName} · {note.createdAt.toLocaleDateString()}
                        {note.visibility === "parent_safe" ? " · parent-safe" : ""}
                      </span>
                      {manager || note.authorId === user.id ? (
                        <form action="/api/clients/actions" method="post" className="opacity-0 group-hover:opacity-100">
                          <input type="hidden" name="intent" value="delete_note" />
                          <input type="hidden" name="clientId" value={client.id} />
                          <input type="hidden" name="noteId" value={note.id} />
                          <button className="hover:text-signal">Remove</button>
                        </form>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
              <form action="/api/clients/actions" method="post" className="mt-3 flex gap-2">
                <input type="hidden" name="clientId" value={client.id} />
                <input type="hidden" name="intent" value="quick_note" />
                <input name="body" required placeholder="e.g. Struggling with math this term" className="field mt-0" />
                <button className="btn">Add</button>
              </form>
            </section>

            <section className="panel rounded-xl p-5">
              <h2 className="font-display text-xl font-semibold tracking-tight">Tasks</h2>
              <ul className="mt-3 space-y-1.5">
                {client.tasks.length === 0 ? <li className="text-sm text-ink/55">No tasks.</li> : null}
                {client.tasks.slice(0, 8).map((task) => (
                  <li key={task.id}>
                    <form action="/api/clients/actions" method="post" className="flex items-center gap-2 text-sm">
                      <input type="hidden" name="intent" value="toggle_task" />
                      <input type="hidden" name="clientId" value={client.id} />
                      <input type="hidden" name="taskId" value={task.id} />
                      <button
                        aria-label={task.done ? "Mark not done" : "Mark done"}
                        className={`grid h-5 w-5 shrink-0 place-items-center rounded border text-xs ${
                          task.done ? "border-accent bg-accent text-white" : "border-ink/25 bg-white"
                        }`}
                      >
                        {task.done ? "✓" : ""}
                      </button>
                      <span className={task.done ? "text-ink/40 line-through" : ""}>{task.title}</span>
                      {task.dueDate ? <span className="ml-auto text-xs text-ink/45">due {task.dueDate}</span> : null}
                    </form>
                  </li>
                ))}
              </ul>
              <form action="/api/clients/actions" method="post" className="mt-3 flex gap-2">
                <input type="hidden" name="clientId" value={client.id} />
                <input type="hidden" name="intent" value="add_task" />
                <input name="title" required placeholder="Send intake form reminder" className="field mt-0" />
                <input type="date" name="dueDate" className="field mt-0 w-40" />
                <button className="btn">Add</button>
              </form>
            </section>
          </div>

          <section className="panel rounded-xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-xl font-semibold tracking-tight">Appointments</h2>
              <nav className="flex gap-1 text-sm">
                {[
                  ["upcoming", "Upcoming"],
                  ["past", "Past"],
                  ["no_show", "No-shows"],
                ].map(([key, label]) => (
                  <Link
                    key={key}
                    href={`/clients/${client.id}?appts=${key}`}
                    scroll={false}
                    className={`rounded-full px-3 py-1 ${apptTab === key ? "bg-[#1a3350] text-paper" : "text-ink/60 hover:bg-ink/[0.05]"}`}
                  >
                    {label} ({client.appointments.filter((a) => (key === "past" ? a.status === "completed" || a.status === "cancelled" : key === "no_show" ? a.status === "no_show" : a.status === "scheduled")).length})
                  </Link>
                ))}
              </nav>
            </div>
            <ul className="mt-3 divide-y divide-ink/[0.06]">
              {apptList.length === 0 ? <li className="py-3 text-sm text-ink/55">None.</li> : null}
              {apptList.slice(0, 8).map((appt) => (
                <li key={appt.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                  <div>
                    <Link href={`/calendar/${appt.id}`} className="font-medium hover:text-accent">
                      {appt.startsAt.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} ·{" "}
                      {appt.startsAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                    </Link>
                    <p className="text-ink/55">
                      {appt.appointmentType?.name ?? "Session"} · {appt.coach.name}
                      {appt.status === "cancelled" ? " · cancelled" : ""}
                    </p>
                  </div>
                  {appt.status === "scheduled" ? (
                    <div className="flex gap-2">
                      {(["complete", "no_show", "cancel"] as const).map((intent) => (
                        <form key={intent} action="/api/appointments" method="post">
                          <input type="hidden" name="intent" value={intent} />
                          <input type="hidden" name="appointmentId" value={appt.id} />
                          <input type="hidden" name="returnTo" value={`${returnTo}?appts=${apptTab}`} />
                          <button className="btn-ghost">
                            {intent === "complete" ? "Complete" : intent === "no_show" ? "No-show" : "Cancel"}
                          </button>
                        </form>
                      ))}
                    </div>
                  ) : appt.creditConsumed && appt.status !== "completed" ? (
                    <form action="/api/appointments" method="post">
                      <input type="hidden" name="intent" value="restore_credit" />
                      <input type="hidden" name="appointmentId" value={appt.id} />
                      <input type="hidden" name="returnTo" value={`${returnTo}?appts=${apptTab}`} />
                      <button className="btn-ghost">Restore credit</button>
                    </form>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>

          <div className="grid gap-6 xl:grid-cols-2">
            <section className="panel rounded-xl p-5">
              <h2 className="font-display text-xl font-semibold tracking-tight">Parent progress update</h2>
              <p className="text-xs text-ink/50">
                Parents only see this short summary, never session details.
              </p>
              {openRequest ? (
                <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  The parent asked for an update on {openRequest.createdAt.toLocaleDateString()}.
                </p>
              ) : null}
              <form action="/api/progress-reports" method="post" className="mt-3 space-y-3">
                <input type="hidden" name="intent" value="send" />
                <input type="hidden" name="clientId" value={client.id} />
                {openRequest ? <input type="hidden" name="reportId" value={openRequest.id} /> : null}
                <label className="block text-sm font-medium">
                  What they are working on
                  <textarea
                    name="focusAreas"
                    rows={2}
                    required
                    defaultValue={client.goals.map((g) => g.title).join("\n")}
                    className="field"
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-sm font-medium">
                    Engagement
                    <select name="engagement" required className="field" defaultValue="">
                      <option value="" disabled>
                        Choose
                      </option>
                      {Object.entries(ENGAGEMENT_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm font-medium">
                    Progress (1–5)
                    <input type="number" name="progress" min={1} max={5} required className="field" />
                  </label>
                </div>
                <label className="block text-sm font-medium">
                  Short note <span className="font-normal text-ink/45">(optional, parent-safe)</span>
                  <textarea name="summary" rows={2} className="field" />
                </label>
                <button className="btn">Send to parent</button>
              </form>
              {client.progressReports.filter((r) => r.status === "sent").length > 0 ? (
                <p className="mt-3 text-xs text-ink/50">
                  Last sent{" "}
                  {client.progressReports.find((r) => r.status === "sent")?.sentAt?.toLocaleDateString()}
                </p>
              ) : null}
            </section>

            <section className="panel rounded-xl p-5">
              <h2 className="font-display text-xl font-semibold tracking-tight">Documents and forms</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {documents.map((doc) => (
                  <li key={doc.id} className="flex items-start justify-between gap-3">
                    <span>{doc.title}</span>
                    <span className="shrink-0 text-xs">
                      {doc.signers.map((role) => (
                        <span
                          key={role}
                          className={`ml-1 rounded-full px-2 py-0.5 ${doc.signed[role] ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}
                        >
                          {role === "client" ? "Student" : "Parent"} {doc.signed[role] ? "signed" : "pending"}
                        </span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 border-t border-ink/[0.08] pt-3">
                <p className="label-caps">Recent forms</p>
                <ul className="mt-2 space-y-1 text-sm">
                  {client.formSubmissions.length === 0 ? <li className="text-ink/55">No forms submitted yet.</li> : null}
                  {client.formSubmissions.map((s) => (
                    <li key={s.id} className="flex justify-between gap-3">
                      <span>{s.template.name}</span>
                      <span className="text-xs text-ink/45">{s.createdAt.toLocaleDateString()}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  <Link href={`/forms?clientId=${client.id}`} className="link-accent">
                    Open forms
                  </Link>
                  <Link href={`/metrics?clientId=${client.id}`} className="link-accent">
                    Metrics
                  </Link>
                  <Link href={`/values?clientId=${client.id}`} className="link-accent">
                    Values
                  </Link>
                  <Link href={`/portfolio?clientId=${client.id}`} className="link-accent">
                    Portfolio
                  </Link>
                </div>
              </div>
            </section>
          </div>

          <details className="panel rounded-xl">
            <summary className="cursor-pointer px-5 py-4 font-display text-xl font-semibold tracking-tight">
              Edit profile
            </summary>
            <form action="/api/clients/actions" method="post" className="space-y-4 border-t border-ink/[0.08] p-5">
              <input type="hidden" name="intent" value="profile" />
              <input type="hidden" name="clientId" value={client.id} />
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-medium">
                  Email
                  <input name="email" type="email" defaultValue={client.email ?? ""} className="field" />
                </label>
                <label className="block text-sm font-medium">
                  Phone
                  <input name="phone" defaultValue={client.phone ?? ""} className="field" />
                </label>
                <label className="block text-sm font-medium">
                  Location
                  <input name="location" defaultValue={client.location ?? ""} className="field" />
                </label>
                <label className="block text-sm font-medium">
                  Group
                  <input name="group" defaultValue={client.group ?? ""} className="field" />
                </label>
                <label className="block text-sm font-medium">
                  Time zone
                  <select name="timezone" defaultValue={client.timezone} className="field">
                    {TIMEZONES.map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                {FOCUS_AREAS.map((area) => (
                  <label key={area} className="chip">
                    <input type="checkbox" name="interests" value={area} defaultChecked={interests.has(area)} />
                    {area}
                  </label>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {TIME_WINDOWS.map((w) => (
                  <label key={w.key} className="chip">
                    <input type="checkbox" name="preferredTimes" value={w.key} defaultChecked={times.has(w.key)} />
                    {w.label}
                  </label>
                ))}
              </div>
              <button className="btn">Save profile</button>
            </form>
            <form
              action="/api/clients/actions"
              method="post"
              encType="multipart/form-data"
              className="flex flex-wrap items-end gap-3 border-t border-ink/[0.08] p-5"
            >
              <input type="hidden" name="intent" value="photo" />
              <input type="hidden" name="clientId" value={client.id} />
              <label className="block text-sm font-medium">
                Profile photo
                <input type="file" name="photo" accept="image/jpeg,image/png,image/webp" className="field" />
              </label>
              <button className="btn-secondary">Upload</button>
            </form>
          </details>
        </div>
      </div>
    </Shell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-ink/50">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}