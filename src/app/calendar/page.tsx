import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getGuardianHouseholdId, isLeadOrAdmin, isStaff, resolveCoachId } from "@/lib/access";
import { guardClientWorkspace } from "@/lib/gate";
import { prisma } from "@/lib/db";
import { clientScope, appointmentScope } from "@/lib/caseload";
import { Notice, Shell } from "@/components/shell";
import { getProgramSettings } from "@/lib/settings";
import { ensureWallet } from "@/lib/credits";
import { minutesToLabel } from "@/lib/matching";
import { releaseDueForms } from "@/lib/releases";

type Search = {
  error?: string;
  notice?: string;
  tab?: string;
  clientId?: string;
  week?: string;
};

const STATUS_STYLES: Record<string, string> = {
  scheduled: "bg-accent/10 text-accent-deep",
  completed: "bg-ink/[0.06] text-ink/70",
  cancelled: "bg-ink/[0.06] text-ink/50",
  no_show: "bg-signal/10 text-signal",
};

export default async function CalendarPage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await getSession();
  if (!user) redirect("/login");
  await guardClientWorkspace(user);
  await releaseDueForms();

  const { error, notice, tab, clientId: preselect, week } = await searchParams;
  const manager = isLeadOrAdmin(user);
  const view = tab ?? (manager ? "team" : "upcoming");
  const settings = await getProgramSettings();
  const coachId = user.role === "coach" ? await resolveCoachId(user) : null;
  const selfBooking = user.role === "client" || user.role === "guardian";

  let scopeClientIds: string[] | null = null;
  let bookableClients: Array<{ id: string; firstName: string; lastName: string; publicId: string }> = [];

  if (user.role === "coach" && coachId) {
    bookableClients = await prisma.client.findMany({
      where: { archivedAt: null, ...(await clientScope(user, coachId)) },
      select: { id: true, firstName: true, lastName: true, publicId: true },
      orderBy: { lastName: "asc" },
    });
  } else if (manager) {
    bookableClients = await prisma.client.findMany({
      where: { archivedAt: null, program: "cm2" },
      select: { id: true, firstName: true, lastName: true, publicId: true },
      orderBy: { lastName: "asc" },
    });
  } else if (user.role === "client" && user.clientId) {
    bookableClients = await prisma.client.findMany({
      where: { id: user.clientId },
      select: { id: true, firstName: true, lastName: true, publicId: true },
    });
    scopeClientIds = bookableClients.map((c) => c.id);
  } else if (user.role === "guardian") {
    const householdId = await getGuardianHouseholdId(user);
    bookableClients = householdId
      ? await prisma.client.findMany({
          where: { householdId, archivedAt: null },
          select: { id: true, firstName: true, lastName: true, publicId: true },
        })
      : [];
    scopeClientIds = bookableClients.map((c) => c.id);
  }

  const statusWhere =
    view === "past"
      ? { status: { in: ["completed", "cancelled"] } }
      : view === "no_show"
        ? { status: "no_show" }
        : { status: "scheduled" };

  const appointments =
    view === "team"
      ? []
      : await prisma.appointment.findMany({
          where: {
            ...statusWhere,
            ...(isStaff(user) ? await appointmentScope(user, coachId) : {}),
            ...(scopeClientIds ? { clientId: { in: scopeClientIds } } : {}),
          },
          include: { client: true, coach: true, appointmentType: true },
          orderBy: { startsAt: view === "upcoming" ? "asc" : "desc" },
          take: 60,
        });

  const types = await prisma.appointmentType.findMany({
    where: { active: true, ...(selfBooking ? { clientCanBook: true } : {}) },
    orderBy: { name: "asc" },
  });
  const coaches = manager
    ? await prisma.coachRoster.findMany({ where: { status: "active" }, orderBy: { name: "asc" } })
    : [];

  let creditBalance: number | null = null;
  if (selfBooking && bookableClients[0]) {
    const client = await prisma.client.findUnique({ where: { id: bookableClients[0].id } });
    if (client) creditBalance = (await ensureWallet(client.householdId)).balance;
  }

  const today = new Date().toISOString().slice(0, 10);
  const tabs: Array<[string, string]> = [
    ...(manager ? ([["team", "Team calendar"]] as Array<[string, string]>) : []),
    ["upcoming", "Upcoming"],
    ["past", "Past"],
    ["no_show", "No-shows"],
  ];
  const refundCopy =
    settings.cancelPolicy === "always_refund"
      ? "Cancelled sessions always return the credit."
      : settings.cancelPolicy === "never_refund"
        ? "Cancelled sessions do not return the credit."
        : `Cancel at least ${settings.cancelRefundHours} hours ahead to get the credit back.`;

  return (
    <Shell user={user}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-caps text-accent">Scheduling</p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
            {selfBooking ? "Appointments" : "Calendar"}
          </h1>
          <p className="mt-2 text-sm text-ink/60">
            {settings.creditsEnabled ? `Each session uses one credit. ${refundCopy}` : "Credits are turned off."}
            {settings.googleCalendarLinked ? " Google Calendar sync on." : ""}
            {settings.outlookCalendarLinked ? " Outlook sync on." : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {creditBalance !== null && settings.creditsEnabled ? (
            <p className="rounded-full border border-ink/15 bg-white px-4 py-2 text-sm">
              Credits left: <strong>{creditBalance}</strong>
            </p>
          ) : null}
          {isStaff(user) ? (
            <Link href="/availability" className="btn-secondary">
              {manager ? "Coach availability" : "My availability"}
            </Link>
          ) : null}
        </div>
      </div>
      <Notice error={error} notice={notice} />

      <nav className="mt-6 flex flex-wrap gap-2 text-sm">
        {tabs.map(([key, label]) => (
          <Link
            key={key}
            href={`/calendar?tab=${key}`}
            className={`rounded-full px-4 py-2 ${
              view === key ? "bg-[#1a3350] text-paper" : "border border-ink/15 bg-white hover:border-ink/30"
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_340px]">
        <section className="min-w-0">
          {view === "team" ? (
            <TeamWeek weekOffset={Number(week ?? 0) || 0} />
          ) : (
            <div className="space-y-3">
              {appointments.length === 0 ? (
                <p className="panel rounded-xl p-6 text-ink/60">Nothing here yet.</p>
              ) : null}
              {appointments.map((appt) => {
                const hoursAway = (appt.startsAt.getTime() - Date.now()) / 3_600_000;
                const late =
                  settings.creditsEnabled &&
                  settings.cancelPolicy === "window" &&
                  appt.creditConsumed &&
                  hoursAway < settings.cancelRefundHours;
                return (
                  <article key={appt.id} className="panel rounded-xl p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm text-ink/55">
                          {appt.startsAt.toLocaleDateString(undefined, {
                            weekday: "long",
                            month: "short",
                            day: "numeric",
                          })}{" "}
                          · {appt.startsAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                        </p>
                        <h2 className="mt-1 font-display text-xl font-semibold tracking-tight">
                          {isStaff(user) ? (
                            <Link href={`/calendar/${appt.id}`} className="link-accent">
                              {appt.client.firstName} {appt.client.lastName}
                            </Link>
                          ) : (
                            (appt.appointmentType?.name ?? "Coaching session")
                          )}
                        </h2>
                        <p className="mt-1 text-sm text-ink/60">
                          {isStaff(user) ? `${appt.appointmentType?.name ?? "Session"} · ` : ""}
                          with {appt.coach.name}
                          {appt.seriesId ? " · repeats weekly" : ""}
                        </p>
                        <span
                          className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[appt.status] ?? ""}`}
                        >
                          {appt.status.replace("_", "-")}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {appt.status === "scheduled" && appt.meetingUrl ? (
                          <a href={appt.meetingUrl} target="_blank" rel="noreferrer" className="btn">
                            Join video
                          </a>
                        ) : null}
                        {isStaff(user) && appt.status === "scheduled" ? (
                          <>
                            <ActionButton id={appt.id} intent="complete" label="Complete" />
                            <ActionButton id={appt.id} intent="no_show" label="No-show" />
                          </>
                        ) : null}
                        {appt.status === "scheduled" ? (
                          <ActionButton id={appt.id} intent="cancel" label={late ? "Late cancel" : "Cancel"} />
                        ) : null}
                        {isStaff(user) && appt.creditConsumed && appt.status !== "scheduled" && appt.status !== "completed" ? (
                          <ActionButton id={appt.id} intent="restore_credit" label="Restore credit" />
                        ) : null}
                      </div>
                    </div>
                    {late && appt.status === "scheduled" ? (
                      <p className="mt-3 text-xs text-signal">
                        Less than {settings.cancelRefundHours} hours away. Cancelling now uses the credit.
                      </p>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="panel h-fit rounded-xl p-5">
          <h2 className="font-display text-xl font-semibold tracking-tight">Book a session</h2>
          {user.role === "coach" ? (
            <p className="mt-1 text-sm text-ink/55">You can book your assigned students.</p>
          ) : null}
          {bookableClients.length === 0 ? (
            <p className="mt-4 text-sm text-ink/60">No students available to book.</p>
          ) : types.length === 0 ? (
            <p className="mt-4 text-sm text-ink/60">
              Your coach will schedule your next session with you.
            </p>
          ) : (
            <form action="/api/appointments" method="post" className="mt-4 space-y-3">
              {bookableClients.length === 1 ? (
                <input type="hidden" name="clientId" value={bookableClients[0].id} />
              ) : (
                <label className="block text-sm font-medium">
                  Student
                  <select name="clientId" required className="field" defaultValue={preselect ?? ""}>
                    <option value="" disabled>
                      Select a student
                    </option>
                    {bookableClients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.firstName} {client.lastName} · {client.publicId}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {manager ? (
                <label className="block text-sm font-medium">
                  Coach
                  <select name="coachId" className="field" defaultValue="">
                    <option value="">Their assigned coach</option>
                    {coaches.map((coach) => (
                      <option key={coach.coachId} value={coach.coachId}>
                        {coach.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label className="block text-sm font-medium">
                Session type
                <select name="appointmentTypeId" className="field" defaultValue={types[0]?.id}>
                  {types.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name} · {type.durationMinutes} min
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm font-medium">
                  Day
                  <input type="date" name="day" required min={today} className="field" />
                </label>
                <label className="block text-sm font-medium">
                  Start time
                  <input type="time" name="startTime" required defaultValue="17:00" step={900} className="field" />
                </label>
              </div>
              {isStaff(user) ? (
                <label className="block text-sm font-medium">
                  Repeat
                  <select name="repeatWeeks" className="field" defaultValue="1">
                    <option value="1">Does not repeat</option>
                    {[2, 4, 6, 8, 10, 12].map((n) => (
                      <option key={n} value={n}>
                        Weekly for {n} weeks
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <button className="btn w-full">Book session</button>
              {settings.notesTakenNotice && isStaff(user) ? (
                <p className="text-xs text-ink/50">
                  The AI scribe takes notes in sessions unless the student has opted out.
                </p>
              ) : null}
            </form>
          )}
        </section>
      </div>
    </Shell>
  );
}

function ActionButton({ id, intent, label }: { id: string; intent: string; label: string }) {
  return (
    <form action="/api/appointments" method="post">
      <input type="hidden" name="intent" value={intent} />
      <input type="hidden" name="appointmentId" value={id} />
      <button className="btn-secondary">{label}</button>
    </form>
  );
}

async function TeamWeek({ weekOffset }: { weekOffset: number }) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7) + weekOffset * 7);
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  const days = Array.from({ length: 7 }, (_, i) => new Date(start.getTime() + i * 86_400_000));

  const coaches = await prisma.coachRoster.findMany({
    where: { status: "active" },
    include: {
      availability: true,
      appointments: {
        where: { startsAt: { gte: start, lt: end }, status: { in: ["scheduled", "completed", "no_show"] } },
        include: { client: true },
        orderBy: { startsAt: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="panel overflow-hidden rounded-xl">
      <div className="flex items-center justify-between border-b border-ink/[0.08] px-5 py-3">
        <p className="text-sm font-medium">
          Week of {start.toLocaleDateString(undefined, { month: "long", day: "numeric" })}
        </p>
        <div className="flex gap-2 text-sm">
          <Link href={`/calendar?tab=team&week=${weekOffset - 1}`} className="btn-ghost">
            ← Previous
          </Link>
          <Link href="/calendar?tab=team" className="btn-ghost">
            This week
          </Link>
          <Link href={`/calendar?tab=team&week=${weekOffset + 1}`} className="btn-ghost">
            Next →
          </Link>
        </div>
      </div>
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Team week calendar">
        <table className="w-full min-w-[860px] table-fixed border-collapse text-xs">
          <thead>
            <tr className="text-left text-ink/50">
              <th className="w-36 px-3 py-2 font-medium">Coach</th>
              {days.map((d) => (
                <th key={d.toISOString()} className="px-2 py-2 font-medium">
                  {d.toLocaleDateString(undefined, { weekday: "short", day: "numeric" })}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {coaches.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-ink/50">
                  No active coaches yet.
                </td>
              </tr>
            ) : null}
            {coaches.map((coach) => (
              <tr key={coach.coachId} className="border-t border-ink/[0.06] align-top">
                <td className="px-3 py-3">
                  <p className="font-medium text-ink">{coach.name}</p>
                  <p className="text-ink/45">
                    {coach.appointments.filter((a) => a.status === "scheduled").length} booked
                  </p>
                </td>
                {days.map((d) => {
                  const slots = coach.availability.filter((s) => s.weekday === d.getDay());
                  const appts = coach.appointments.filter(
                    (a) => a.startsAt.toDateString() === d.toDateString(),
                  );
                  return (
                    <td key={d.toISOString()} className="space-y-1 px-1.5 py-2">
                      {slots.map((s) => (
                        <p key={s.id} className="rounded bg-emerald-50 px-1.5 py-1 text-emerald-800">
                          Free {minutesToLabel(s.startMinute)}–{minutesToLabel(s.endMinute)}
                        </p>
                      ))}
                      {appts.map((a) =>
                        a.client.program === "private" ? (
                          // A coach's own client: show the time as taken, nothing else.
                          <p key={a.id} className="rounded bg-ink/10 px-1.5 py-1 text-ink/60">
                            Busy {a.startsAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · outside CM2
                          </p>
                        ) : (
                          <Link
                            key={a.id}
                            href={`/calendar/${a.id}`}
                            className={`block rounded px-1.5 py-1 ${
                              a.status === "no_show" ? "bg-signal/15 text-signal" : "bg-[#1a3350] text-paper"
                            }`}
                          >
                            Busy {a.startsAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} ·{" "}
                            {a.client.firstName}
                          </Link>
                        ),
                      )}
                      {slots.length === 0 && appts.length === 0 ? <p className="px-1.5 text-ink/25">—</p> : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t border-ink/[0.08] px-5 py-3 text-xs text-ink/50">
        Green shows posted availability. Navy shows booked sessions. Only managers see this view.
      </p>
    </div>
  );
}
