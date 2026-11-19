import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isLeadOrAdmin } from "@/lib/access";
import { Notice, Shell } from "@/components/shell";
import { internClearance, internRecord, onTeamWhere, teamIdsOf } from "@/lib/gate";
import { prisma } from "@/lib/db";
import { PROGRAM_TZ, dueLabel, isOverdue, localParts } from "@/lib/commitments";

export const metadata = { title: "Commitments | Coach Me 2" };

type Row = Awaited<ReturnType<typeof load>>[number];

function load(where: object) {
  return prisma.internCommitment.findMany({
    where,
    include: { intern: { include: { team: true } } },
    orderBy: { dueAt: "asc" },
    take: 500,
  });
}

function todayInput() {
  const t = localParts(new Date());
  return `${t.year}-${String(t.month).padStart(2, "0")}-${String(t.day).padStart(2, "0")}`;
}

function statusOf(c: Row, now: Date) {
  if (c.status === "done") return { label: "Done", tone: "bg-emerald-100 text-emerald-900" };
  if (isOverdue(c, now)) {
    const days = Math.max(1, Math.floor((now.getTime() - c.dueAt.getTime()) / 86_400_000));
    return { label: days === 1 ? "Overdue" : `Overdue ${days} days`, tone: "bg-signal/15 text-signal" };
  }
  const hours = (c.dueAt.getTime() - now.getTime()) / 3_600_000;
  if (hours < 24) return { label: "Due soon", tone: "bg-amber-100 text-amber-900" };
  return { label: "On track", tone: "bg-accent/10 text-accent" };
}

function Card({ c, now, mine, canNudge, manager }: { c: Row; now: Date; mine: boolean; canNudge: boolean; manager: boolean }) {
  const status = statusOf(c, now);
  return (
    <li className="panel rounded-xl p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-ink">{c.what}</p>
          <p className="mt-1 text-sm text-ink/60">
            {mine ? "You" : `${c.intern.firstName} ${c.intern.lastName}`} · due {dueLabel(c.dueAt, now)}
            {c.source === "chat" ? ` · said in ${c.channelName || "team chat"}` : ""}
            {c.timesMoved ? ` · moved ${c.timesMoved}×` : ""}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status.tone}`}>{status.label}</span>
      </div>
      {c.status === "open" && (mine || manager || canNudge) ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {mine || manager ? (
            <>
              <form action="/api/commitments" method="post">
                <input type="hidden" name="intent" value="done" />
                <input type="hidden" name="id" value={c.id} />
                <button className="btn px-4 py-1.5 text-sm">Mark done</button>
              </form>
              <form action="/api/commitments" method="post" className="flex items-center gap-2">
                <input type="hidden" name="intent" value="move" />
                <input type="hidden" name="id" value={c.id} />
                <label className="sr-only" htmlFor={`move-${c.id}`}>
                  New due date
                </label>
                <input id={`move-${c.id}`} type="date" name="dueOn" min={todayInput()} required className="field mt-0 w-auto py-1.5 text-sm" />
                <button className="btn-secondary px-3 py-1.5 text-sm">Move</button>
              </form>
              <form action="/api/commitments" method="post">
                <input type="hidden" name="intent" value="drop" />
                <input type="hidden" name="id" value={c.id} />
                <button className="btn-ghost px-3 py-1.5 text-sm">Remove</button>
              </form>
            </>
          ) : (
            <form action="/api/commitments" method="post">
              <input type="hidden" name="intent" value="nudge" />
              <input type="hidden" name="id" value={c.id} />
              <button className="btn-secondary px-3 py-1.5 text-sm">Nudge {c.intern.firstName}</button>
            </form>
          )}
        </div>
      ) : null}
    </li>
  );
}

/** Track record per intern: kept, overdue, and how often dates moved. */
function Scoreboard({ rows, now }: { rows: Row[]; now: Date }) {
  const people = new Map<string, { name: string; team: string; kept: number; late: number; overdue: number; open: number; moved: number }>();
  for (const c of rows) {
    if (c.status === "dropped") continue;
    const p = people.get(c.internId) ?? {
      name: `${c.intern.firstName} ${c.intern.lastName}`,
      team: c.intern.team.name,
      kept: 0,
      late: 0,
      overdue: 0,
      open: 0,
      moved: 0,
    };
    if (c.status === "done") {
      if (c.doneAt && c.doneAt.getTime() > c.dueAt.getTime()) p.late += 1;
      else p.kept += 1;
    } else if (isOverdue(c, now)) p.overdue += 1;
    else p.open += 1;
    p.moved += c.timesMoved;
    people.set(c.internId, p);
  }
  const list = [...people.values()].sort((a, b) => b.overdue - a.overdue || a.name.localeCompare(b.name));
  if (list.length === 0) return null;
  return (
    <div className="panel mt-4 overflow-x-auto rounded-xl">
      <table className="w-full min-w-[34rem] text-left text-sm">
        <thead className="text-xs uppercase tracking-wide text-ink/55">
          <tr>
            <th className="px-4 py-3 font-semibold">Intern</th>
            <th className="px-4 py-3 font-semibold">Kept on time</th>
            <th className="px-4 py-3 font-semibold">Done late</th>
            <th className="px-4 py-3 font-semibold">Overdue now</th>
            <th className="px-4 py-3 font-semibold">In progress</th>
            <th className="px-4 py-3 font-semibold">Dates moved</th>
          </tr>
        </thead>
        <tbody>
          {list.map((p) => (
            <tr key={p.name} className="border-t border-ink/10">
              <td className="px-4 py-3">
                <span className="font-medium">{p.name}</span>
                <span className="block text-xs text-ink/55">{p.team}</span>
              </td>
              <td className="px-4 py-3">{p.kept}</td>
              <td className="px-4 py-3">{p.late}</td>
              <td className={`px-4 py-3 ${p.overdue ? "font-semibold text-signal" : ""}`}>{p.overdue}</td>
              <td className="px-4 py-3">{p.open}</td>
              <td className="px-4 py-3">{p.moved}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function CommitmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string; team?: string }>;
}) {
  const user = await getSession();
  if (!user) redirect("/login");
  const manager = isLeadOrAdmin(user);
  const me = user.role === "intern" ? await internRecord(user) : null;
  if (!manager && !me) redirect("/workspace");
  if (me && !(await internClearance(me.id)).ready) redirect("/intern/start");

  const { error, notice, team } = await searchParams;
  const teams = manager ? await prisma.internTeam.findMany({ orderBy: { name: "asc" } }) : [];
  const myTeams = me ? teamIdsOf(me) : [];
  const teamFilter = manager ? (team ? { teamId: team } : {}) : { teamId: { in: myTeams } };
  const since = new Date(Date.now() - 60 * 86_400_000);
  const rows = await load({ ...teamFilter, OR: [{ status: "open" }, { createdAt: { gte: since } }] });
  const interns = manager
    ? await prisma.intern.findMany({ where: team ? onTeamWhere(team) : {}, orderBy: { firstName: "asc" } })
    : [];
  const now = new Date();

  const mine = me ? rows.filter((c) => c.internId === me.id && c.status === "open") : [];
  const others = rows.filter((c) => c.status === "open" && c.internId !== me?.id);
  const overdue = others.filter((c) => isOverdue(c, now));
  const upcoming = others.filter((c) => !isOverdue(c, now));
  const done = rows.filter((c) => c.status === "done").sort((a, b) => (b.doneAt?.getTime() ?? 0) - (a.doneAt?.getTime() ?? 0)).slice(0, 12);

  return (
    <Shell user={user}>
      <p className="label-caps text-accent">{manager ? "All teams" : "Your teams"}</p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">Commitments</h1>
      <p className="mt-3 max-w-2xl text-ink/65">
        What everyone said they&apos;d do, and by when. Say it in team chat (&ldquo;I&apos;ll send the flyer by
        Wednesday&rdquo;) and it lands here automatically. Your team sees it, and you get a reminder the morning it&apos;s due
        and if it slips. All times are Eastern ({PROGRAM_TZ.replace("_", " ")}).
      </p>
      <Notice error={error} notice={notice} />

      {manager ? (
        <form className="mt-6 flex flex-wrap items-end gap-3" method="get">
          <label className="block text-sm font-medium">
            Team
            <select name="team" defaultValue={team ?? ""} className="field">
              <option value="">All teams</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <button className="btn-secondary">Show</button>
        </form>
      ) : null}

      <section className="mt-8">
        <h2 className="font-display text-2xl font-semibold tracking-tight">{manager ? "Add a commitment for an intern" : "I will…"}</h2>
        <form action="/api/commitments" method="post" className="panel mt-4 grid max-w-3xl gap-4 rounded-xl p-5 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <input type="hidden" name="intent" value="create" />
          {manager ? (
            <label className="block text-sm font-medium sm:col-span-3">
              Intern
              <select name="internId" required className="field">
                {interns.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.firstName} {i.lastName}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="block text-sm font-medium">
            What
            <input name="what" required maxLength={200} placeholder="Send the partner school the flyer" className="field" />
          </label>
          <label className="block text-sm font-medium">
            By
            <input type="date" name="dueOn" required min={todayInput()} className="field" />
          </label>
          <button className="btn">Commit</button>
        </form>
      </section>

      {me ? (
        <section className="mt-10">
          <h2 className="font-display text-2xl font-semibold tracking-tight">Mine</h2>
          {mine.length ? (
            <ul className="mt-4 grid gap-3">
              {mine.map((c) => (
                <Card key={c.id} c={c} now={now} mine canNudge={false} manager={manager} />
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-ink/60">Nothing open. Add one above, or say it in team chat.</p>
          )}
        </section>
      ) : null}

      {overdue.length ? (
        <section className="mt-10">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-signal">Overdue</h2>
          <ul className="mt-4 grid gap-3">
            {overdue.map((c) => (
              <Card key={c.id} c={c} now={now} mine={false} canNudge={myTeams.includes(c.teamId ?? "")} manager={manager} />
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold tracking-tight">{manager ? "Coming up" : "Team, coming up"}</h2>
        {upcoming.length ? (
          <ul className="mt-4 grid gap-3">
            {upcoming.map((c) => (
              <Card key={c.id} c={c} now={now} mine={false} canNudge={myTeams.includes(c.teamId ?? "")} manager={manager} />
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-ink/60">No open commitments{manager ? "" : " from your team"} right now.</p>
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold tracking-tight">Track record</h2>
        <p className="mt-1 text-sm text-ink/60">The last 60 days.</p>
        <Scoreboard rows={rows} now={now} />
      </section>

      {done.length ? (
        <section className="mt-10">
          <h2 className="font-display text-2xl font-semibold tracking-tight">Recently done</h2>
          <ul className="mt-4 grid gap-3">
            {done.map((c) => (
              <Card key={c.id} c={c} now={now} mine={c.internId === me?.id} canNudge={false} manager={manager} />
            ))}
          </ul>
        </section>
      ) : null}
    </Shell>
  );
}
