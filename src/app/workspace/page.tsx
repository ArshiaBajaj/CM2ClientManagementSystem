import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, type SessionUser } from "@/lib/auth";
import { getGuardianHouseholdId, isLeadOrAdmin, resolveCoachId } from "@/lib/access";
import { accessOverview, coachGate, homeFor } from "@/lib/gate";
import { httpsUrl } from "@/lib/public-url";
import { prisma } from "@/lib/db";
import { clientScope, appointmentScope } from "@/lib/caseload";
import { Guide } from "@/components/guide";
import { Notice, Shell } from "@/components/shell";
import { Avatar } from "@/components/avatar";
import { ensureWallet } from "@/lib/credits";
import { documentStatusFor } from "@/lib/documents";
import { releaseDueForms } from "@/lib/releases";

const ENGAGEMENT_LABELS: Record<string, string> = {
  engaged: "Engaged",
  somewhat: "Somewhat engaged",
  not_yet: "Not engaged yet",
};

function when(date: Date) {
  return `${date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} · ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

export default async function WorkspacePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role === "intern" || user.role === "intern_parent") redirect(await homeFor(user));
  if (user.role === "coach" && (await coachGate(user)) === "forms") redirect("/onboarding");
  const { error, notice } = await searchParams;
  await releaseDueForms();

  if (user.role === "coach") {
    const roster = await prisma.coachRoster.findFirst({
      where: { OR: [{ coachId: user.coachId ?? "" }, { email: user.email }] },
    });
    if (roster?.status !== "active") {
      return (
        <Shell user={user}>
          <div className="max-w-xl">
            <p className="label-caps text-accent">Access held</p>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight">Activation comes first</h1>
            <p className="mt-4 text-ink/65">
              A reviewer has to activate this coach account before the forms in this workspace open. After that,
              you&apos;ll sign the coach agreement here, and only then will students appear.
            </p>
            {httpsUrl(process.env.ONBOARDING_APP_URL) ? (
              <a href={httpsUrl(process.env.ONBOARDING_APP_URL) ?? ""} className="btn mt-7">
                Open coach onboarding
              </a>
            ) : (
              <p className="mt-4 text-sm text-ink/55">Ask your program manager if your application is still in review.</p>
            )}
          </div>
        </Shell>
      );
    }
  }

  return (
    <Shell user={user}>
      <p className="label-caps text-accent">
        {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
      </p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">Hi, {user.name.split(" ")[0]}</h1>
      {user.role === "client" ? (
        <p className="mt-3 max-w-2xl text-ink/65">
          This is your teen coaching space: sessions, goals, and messages with your coach. Intern team work uses a different login.
        </p>
      ) : null}
      <Notice error={error} notice={notice} />
      {user.role === "guardian" ? (
        <GuardianHome user={user} />
      ) : user.role === "client" ? (
        <ClientHome user={user} />
      ) : (
        <StaffHome user={user} />
      )}
    </Shell>
  );
}

async function StaffHome({ user }: { user: SessionUser }) {
  const manager = isLeadOrAdmin(user);
  const coachId = manager ? null : await resolveCoachId(user);
  const scope = await clientScope(user, coachId);
  const apptScope = await appointmentScope(user, coachId);
  const weekAhead = new Date(Date.now() + 7 * 86_400_000);

  const [clients, sessions, reportRequests, newRequests, overdue] = await Promise.all([
    prisma.client.findMany({
      where: { archivedAt: null, ...scope },
      include: { assignments: { where: { status: "active" }, include: { coach: true } }, goals: { where: { status: "active" } } },
      orderBy: { lastName: "asc" },
    }),
    prisma.appointment.findMany({
      where: {
        status: "scheduled",
        startsAt: { gte: new Date(Date.now() - 3_600_000), lte: weekAhead },
        ...apptScope,
      },
      include: { client: true, coach: true, appointmentType: true },
      orderBy: { startsAt: "asc" },
      take: 8,
    }),
    prisma.progressReport.findMany({
      where: { status: "requested", client: { archivedAt: null, ...scope } },
      include: { client: true },
    }),
    manager ? prisma.coachRequest.count({ where: { status: "new" } }) : Promise.resolve(0),
    prisma.appointment.count({
      where: { status: "scheduled", endsAt: { lt: new Date() }, ...apptScope },
    }),
  ]);

  const unmatched = clients.filter((c) => c.assignments.length === 0).length;
  const docStatus = await Promise.all(clients.map(async (c) => ({ c, docs: await documentStatusFor(c.id) })));
  const unsigned = docStatus.filter(({ docs }) => docs.some((d) => !d.complete)).length;

  const todo: Array<{ label: string; href: string }> = [];
  for (const r of reportRequests) {
    todo.push({ label: `${r.client.firstName}'s parent asked for a progress update`, href: `/clients/${r.clientId}` });
  }
  if (overdue > 0) todo.push({ label: `${overdue} past session${overdue === 1 ? "" : "s"} to mark complete or no-show`, href: "/calendar?tab=upcoming" });
  if (manager && newRequests > 0) todo.push({ label: `${newRequests} new coach request${newRequests === 1 ? "" : "s"} from the website`, href: "/matching" });
  if (manager && unmatched > 0) todo.push({ label: `${unmatched} student${unmatched === 1 ? "" : "s"} waiting for a coach`, href: "/matching" });
  if (unsigned > 0) todo.push({ label: `${unsigned} student${unsigned === 1 ? " has" : "s have"} unsigned documents`, href: manager ? "/documents" : "/clients" });
  if (manager) {
    const overview = await accessOverview();
    const waitingCoaches = overview.coaches.filter((coach) => !coach.formsDone);
    const waitingInterns = overview.interns.filter((intern) => !intern.internDone || !intern.parentDone);
    if (waitingCoaches.length > 0) {
      todo.push({
        label: `${waitingCoaches.length} coach${waitingCoaches.length === 1 ? "" : "es"} still finishing forms`,
        href: "/interns#coaches",
      });
    }
    if (waitingInterns.length > 0) {
      todo.push({
        label: `${waitingInterns.length} intern${waitingInterns.length === 1 ? "" : "s"} waiting on signed forms`,
        href: "/interns",
      });
    }
  }

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <section className="panel rounded-xl p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold tracking-tight">Next 7 days</h2>
            <Link href="/calendar?tab=upcoming" className="link-accent text-sm">
              Calendar
            </Link>
          </div>
          <ul className="mt-3 divide-y divide-ink/[0.06]">
            {sessions.length === 0 ? <li className="py-3 text-sm text-ink/55">No sessions booked.</li> : null}
            {sessions.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-3">
                  <Avatar url={s.client.avatarUrl} initials={`${s.client.firstName[0]}${s.client.lastName[0]}`} size="sm" />
                  <div>
                    <Link href={`/calendar/${s.id}`} className="font-medium hover:text-accent">
                      {s.client.firstName} {s.client.lastName}
                    </Link>
                    <p className="text-sm text-ink/55">
                      {when(s.startsAt)} · {s.appointmentType?.name ?? "Session"}
                      {manager ? ` · ${s.coach.name}` : ""}
                    </p>
                  </div>
                </div>
                {s.meetingUrl ? (
                  <a href={s.meetingUrl} target="_blank" rel="noreferrer" className="btn-secondary">
                    Join
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        <section className="panel rounded-xl p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold tracking-tight">
              {manager ? "All students" : "My students"} <span className="text-ink/40">({clients.length})</span>
            </h2>
            <Link href="/clients" className="link-accent text-sm">
              Clients
            </Link>
          </div>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {clients.slice(0, 10).map((c) => (
              <li key={c.id}>
                <Link
                  href={`/clients/${c.id}`}
                  className="flex items-center gap-3 rounded-lg border border-ink/[0.08] p-3 transition hover:border-accent/40"
                >
                  <Avatar url={c.avatarUrl} initials={`${c.firstName[0]}${c.lastName[0]}`} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {c.firstName} {c.lastName}
                    </p>
                    <p className="truncate text-xs text-ink/50">
                      {manager ? `${c.assignments[0]?.coach.name ?? "No coach"} · ` : ""}
                      {c.goals.length} active goal{c.goals.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <aside className="space-y-4">
        <section className="panel rounded-xl p-5">
          <h2 className="font-display text-xl font-semibold tracking-tight">To do</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {todo.length === 0 ? <li className="text-ink/55">You&apos;re all caught up.</li> : null}
            {todo.map((t) => (
              <li key={t.label}>
                <Link href={t.href} className="flex items-start gap-2 rounded-md p-2 hover:bg-accent/5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  {t.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-xl border border-signal/25 bg-signal/5 p-5 text-sm">
          <p className="font-medium text-signal">Safety</p>
          <p className="mt-1 text-ink/70">
            Coaching is confidential unless someone may be harmed. If a child may be abused, call
            1-855-GA-CHILD right away, then tell your program lead.
          </p>
        </section>
      </aside>
    </div>
  );
}

async function ClientHome({ user }: { user: SessionUser }) {
  const client = await prisma.client.findUnique({
    where: { id: user.clientId ?? "" },
    include: {
      assignments: { where: { status: "active" }, include: { coach: true } },
      goals: { where: { status: "active" }, include: { checkIns: true } },
      formReleases: { where: { status: "released" }, include: { template: true } },
      appointments: {
        where: { status: "scheduled", startsAt: { gte: new Date(Date.now() - 3_600_000) } },
        orderBy: { startsAt: "asc" },
        take: 3,
        include: { appointmentType: true },
      },
      valuesResults: { take: 1 },
      portfolioItems: { take: 1 },
    },
  });
  if (!client) return <p className="mt-8 text-ink/60">Your account is not linked to a student record yet.</p>;

  const docs = (await documentStatusFor(client.id)).filter((d) => d.signers.includes("client") && !d.signed.client);
  const today = new Date().toISOString().slice(0, 10);
  const goalsDue = client.goals.filter((g) => g.interactive && !g.checkIns.some((c) => c.day === today));
  const next = client.appointments[0];
  const coach = client.assignments[0]?.coach;

  return (
    <div className="mt-6">
      <Guide
        steps={[
          { title: "Your session", body: "See the next appointment, or book one if the calendar is empty." },
          { title: "Today", body: "Check in on a goal, sign a form, or answer anything your coach released." },
          { title: "Your coach", body: "Message them from this page. Family members have their own login." },
        ]}
      />
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <section className="panel rounded-xl p-6">
          <p className="label-caps">Next session</p>
          {next ? (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-display text-2xl font-semibold tracking-tight">{when(next.startsAt)}</p>
                <p className="text-sm text-ink/55">
                  {next.appointmentType?.name ?? "Coaching session"}
                  {coach ? ` with ${coach.name}` : ""}
                </p>
              </div>
              {next.meetingUrl ? (
                <a href={next.meetingUrl} target="_blank" rel="noreferrer" className="btn">
                  Join video
                </a>
              ) : null}
            </div>
          ) : (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <p className="text-ink/60">Nothing booked yet.</p>
              <Link href="/calendar" className="btn">
                Book a session
              </Link>
            </div>
          )}
        </section>

        <section className="panel rounded-xl p-6">
          <h2 className="font-display text-xl font-semibold tracking-tight">For you to do</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {goalsDue.map((g) => (
              <li key={g.id}>
                <Link href="/goals" className="flex items-center justify-between rounded-md border border-ink/[0.08] p-3 hover:border-accent/40">
                  <span>Did you do “{g.title}” today?</span>
                  <span className="text-accent">Check in →</span>
                </Link>
              </li>
            ))}
            {client.formReleases.map((r) => (
              <li key={r.id}>
                <Link href={`/forms?fill=${r.template.key}`} className="flex items-center justify-between rounded-md border border-ink/[0.08] p-3 hover:border-accent/40">
                  <span>Fill out: {r.template.name}</span>
                  <span className="text-accent">Open →</span>
                </Link>
              </li>
            ))}
            {docs.map((d) => (
              <li key={d.id}>
                <Link href="/documents" className="flex items-center justify-between rounded-md border border-ink/[0.08] p-3 hover:border-accent/40">
                  <span>Sign: {d.title}</span>
                  <span className="text-accent">Sign →</span>
                </Link>
              </li>
            ))}
            {goalsDue.length + client.formReleases.length + docs.length === 0 ? (
              <li className="text-ink/55">You&apos;re all caught up.</li>
            ) : null}
          </ul>
        </section>
      </div>

      <aside className="space-y-4">
        <section className="panel rounded-xl p-5">
          <p className="label-caps">Your coach</p>
          {coach ? (
            <>
              <p className="mt-2 font-display text-xl font-semibold tracking-tight">{coach.name}</p>
              <Link href="/chat/open" className="btn-secondary mt-3 w-full">
                Message your coach
              </Link>
            </>
          ) : (
            <p className="mt-2 text-sm text-ink/60">We&apos;re matching you with a coach.</p>
          )}
        </section>
        <section className="panel rounded-xl p-5 text-sm">
          <p className="label-caps">Grow</p>
          <Link href="/values" className="mt-3 block rounded-md p-2 hover:bg-accent/5">
            <span className="font-medium">Values inventory</span>
            <span className="block text-ink/55">
              {client.valuesResults.length ? "See your world view map" : "Find your top values in 5 minutes"}
            </span>
          </Link>
          <Link href="/portfolio" className="block rounded-md p-2 hover:bg-accent/5">
            <span className="font-medium">Portfolio</span>
            <span className="block text-ink/55">
              {client.portfolioItems.length ? "Add your latest win" : "Start logging awards and activities"}
            </span>
          </Link>
        </section>
      </aside>
    </div>
    </div>
  );
}

async function GuardianHome({ user }: { user: SessionUser }) {
  const householdId = await getGuardianHouseholdId(user);
  if (!householdId) return <p className="mt-8 text-ink/60">No student is linked to this account yet.</p>;

  const [students, wallet] = await Promise.all([
    prisma.client.findMany({
      where: { householdId, archivedAt: null },
      include: {
        assignments: { where: { status: "active" }, include: { coach: true } },
        appointments: {
          where: { status: "scheduled", startsAt: { gte: new Date() } },
          orderBy: { startsAt: "asc" },
          take: 1,
        },
        progressReports: { orderBy: { createdAt: "desc" }, take: 4 },
      },
    }),
    ensureWallet(householdId),
  ]);
  const docsByStudent = new Map(
    await Promise.all(
      students.map(
        async (s) =>
          [s.id, (await documentStatusFor(s.id)).filter((d) => d.signers.includes("guardian") && !d.signed.guardian)] as const,
      ),
    ),
  );

  return (
    <div className="mt-6 space-y-6">
      <p className="max-w-2xl text-ink/60">
        What your student shares with their coach stays private, unless someone&apos;s safety is at
        risk. You&apos;ll get short progress updates and can message the coach any time.
      </p>
      {students.map((s) => {
        const docs = docsByStudent.get(s.id) ?? [];
        const reports = s.progressReports.filter((r) => r.status === "sent");
        const open = s.progressReports.find((r) => r.status === "requested");
        return (
          <article key={s.id} className="panel rounded-xl p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-semibold tracking-tight">{s.firstName}</h2>
                <p className="text-sm text-ink/55">Coach: {s.assignments[0]?.coach.name ?? "Being matched"}</p>
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="rounded-full border border-ink/15 bg-white px-3 py-1.5">Credits: {wallet.balance}</span>
                <span className="rounded-full border border-ink/15 bg-white px-3 py-1.5">
                  Next: {s.appointments[0] ? when(s.appointments[0].startsAt) : "not booked"}
                </span>
              </div>
            </div>

            {docs.length > 0 ? (
              <Link href="/documents" className="mt-4 flex items-center justify-between rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <span>
                  {docs.length} document{docs.length === 1 ? "" : "s"} need your signature
                </span>
                <span>Sign →</span>
              </Link>
            ) : null}

            <div className="mt-5 grid gap-6 md:grid-cols-2">
              <section>
                <h3 className="label-caps">Progress updates</h3>
                {reports.length === 0 ? <p className="mt-2 text-sm text-ink/55">No updates yet.</p> : null}
                <ul className="mt-2 space-y-3">
                  {reports.map((r) => (
                    <li key={r.id} className="rounded-lg border border-ink/[0.08] p-4 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{ENGAGEMENT_LABELS[r.engagement ?? ""] ?? "Update"}</span>
                        <span className="text-xs text-ink/45">{r.sentAt?.toLocaleDateString()}</span>
                      </div>
                      <div className="mt-2 flex items-center gap-1" aria-label={`Progress ${r.progress} of 5`}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <span key={n} className={`h-2 flex-1 rounded-full ${n <= (r.progress ?? 0) ? "bg-accent" : "bg-ink/10"}`} />
                        ))}
                      </div>
                      <p className="mt-2 text-ink/50">Working on</p>
                      <p className="whitespace-pre-line">{r.focusAreas}</p>
                      {r.summary ? <p className="mt-2 text-ink/70">{r.summary}</p> : null}
                      <p className="mt-2 text-xs text-ink/45">From {r.coachName}</p>
                    </li>
                  ))}
                </ul>
                <form action="/api/progress-reports" method="post" className="mt-3">
                  <input type="hidden" name="intent" value="request" />
                  <input type="hidden" name="clientId" value={s.id} />
                  <button className="btn-secondary" disabled={Boolean(open)}>
                    {open ? "Update requested" : "Request a progress update"}
                  </button>
                </form>
              </section>
              <form action="/api/notes" method="post" className="space-y-3">
                <input type="hidden" name="clientId" value={s.id} />
                <input type="hidden" name="visibility" value="household" />
                <input type="hidden" name="returnTo" value="/workspace" />
                <label className="block text-sm font-medium">
                  Message {s.assignments[0]?.coach.name.split(" ")[0] ?? "the coach"}
                  <textarea name="body" required rows={4} className="field" placeholder="Scheduling, a concern, or an update for the coach" />
                </label>
                <button className="btn">Send</button>
              </form>
            </div>
          </article>
        );
      })}
    </div>
  );
}
