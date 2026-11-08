import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isLeadOrAdmin } from "@/lib/access";
import { prisma } from "@/lib/db";
import { Notice, Shell } from "@/components/shell";
import { TIME_WINDOWS, splitList, suggestCoaches, type CoachSuggestion } from "@/lib/matching";
import { timezoneLabel } from "@/lib/timezones";

function windowLabels(raw: string) {
  const keys = new Set(splitList(raw));
  return TIME_WINDOWS.filter((w) => keys.has(w.key)).map((w) => w.label);
}

export default async function MatchingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const user = await getSession();
  if (!user) redirect("/login");
  if (!isLeadOrAdmin(user)) redirect("/workspace");
  const { error, notice } = await searchParams;

  const [coaches, clients, pairings, requests] = await Promise.all([
    prisma.coachRoster.findMany({ where: { status: "active" }, orderBy: { name: "asc" } }),
    prisma.client.findMany({
      where: { archivedAt: null },
      include: { household: true, assignments: { where: { status: "active" }, include: { coach: true } } },
      orderBy: { lastName: "asc" },
    }),
    prisma.assignment.findMany({
      where: { status: "active" },
      include: { coach: true, client: true, sessionAllowance: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.coachRequest.findMany({ where: { status: "new" }, orderBy: { createdAt: "asc" } }),
  ]);

  const unassigned = clients.filter((client) => client.assignments.length === 0);
  const clientSuggestions = await Promise.all(
    unassigned.map(async (client) => ({
      client,
      suggestions: await suggestCoaches({ interests: client.interests, preferredTimes: client.preferredTimes }),
    })),
  );
  const requestSuggestions = await Promise.all(
    requests.map(async (req) => ({
      req,
      suggestions: await suggestCoaches({ interests: req.interests, preferredTimes: req.preferredTimes }),
    })),
  );

  return (
    <Shell user={user}>
      <p className="label-caps text-accent">Program ops</p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">Coach matching</h1>
      <p className="mt-3 max-w-2xl text-ink/60">
        For each student we suggest three coaches, ranked by schedule overlap, shared focus areas, and
        open spots. Review the reasons and choose one.
      </p>
      <Notice error={error} notice={notice} />

      <section className="mt-8">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          Requests from the website <span className="text-ink/40">({requests.length})</span>
        </h2>
        <p className="mt-1 text-sm text-ink/55">
          From the public{" "}
          <Link href="/get-a-coach" className="link-accent">
            Get a coach
          </Link>{" "}
          form. Choosing a coach opens enrollment with the details filled in.
        </p>
        <div className="mt-4 space-y-4">
          {requests.length === 0 ? <p className="panel rounded-xl p-5 text-sm text-ink/55">No new requests.</p> : null}
          {requestSuggestions.map(({ req, suggestions }) => (
            <article key={req.id} className="panel rounded-xl p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-xl font-semibold tracking-tight">{req.studentName}</h3>
                  <p className="text-sm text-ink/55">
                    {req.grade ? `Grade ${req.grade} · ` : ""}
                    {timezoneLabel(req.timezone)} time · requested {req.createdAt.toLocaleDateString()}
                  </p>
                  <p className="mt-2 text-sm">
                    <span className="text-ink/50">Wants help with:</span> {req.interests || "—"}
                  </p>
                  <p className="text-sm">
                    <span className="text-ink/50">Available:</span> {windowLabels(req.preferredTimes).join(", ") || "Flexible"}
                  </p>
                  {req.notes ? <p className="mt-2 max-w-xl text-sm text-ink/70">“{req.notes}”</p> : null}
                </div>
                <form action="/api/coach-requests" method="post">
                  <input type="hidden" name="intent" value="close" />
                  <input type="hidden" name="requestId" value={req.id} />
                  <button className="btn-ghost">Close request</button>
                </form>
              </div>
              <Suggestions
                suggestions={suggestions}
                action={(s) => (
                  <Link href={`/clients/new?requestId=${req.id}&coachId=${s.coachId}`} className="btn w-full">
                    Choose {s.name.split(" ")[0]}
                  </Link>
                )}
              />
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          Enrolled students without a coach <span className="text-ink/40">({unassigned.length})</span>
        </h2>
        <div className="mt-4 space-y-4">
          {unassigned.length === 0 ? (
            <p className="panel rounded-xl p-5 text-sm text-ink/55">Every enrolled student has a coach.</p>
          ) : null}
          {clientSuggestions.map(({ client, suggestions }) => (
            <article key={client.id} className="panel rounded-xl p-5">
              <h3 className="font-display text-xl font-semibold tracking-tight">
                <Link href={`/clients/${client.id}`} className="link-accent">
                  {client.firstName} {client.lastName}
                </Link>{" "}
                <span className="font-mono text-sm font-normal text-ink/45">{client.publicId}</span>
              </h3>
              <p className="mt-1 text-sm text-ink/55">
                Wants help with: {client.interests || "not set"} · Available:{" "}
                {windowLabels(client.preferredTimes).join(", ") || "not set"}
              </p>
              <Suggestions
                suggestions={suggestions}
                action={(s) => (
                  <form action="/api/assignments" method="post">
                    <input type="hidden" name="intent" value="create" />
                    <input type="hidden" name="coachId" value={s.coachId} />
                    <input type="hidden" name="clientId" value={client.id} />
                    <input type="hidden" name="allowed" value="12" />
                    <input type="hidden" name="returnTo" value="/matching" />
                    <button className="btn w-full">Pair with {s.name.split(" ")[0]}</button>
                  </form>
                )}
              />
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold tracking-tight">Active pairings</h2>
        <div className="mt-4 space-y-3">
          {pairings.length === 0 ? <p className="text-ink/60">No active pairings yet.</p> : null}
          {pairings.map((pairing) => (
            <article key={pairing.id} className="panel flex flex-wrap items-center justify-between gap-4 rounded-xl p-5">
              <div>
                <h3 className="font-display text-lg font-semibold tracking-tight">
                  <Link href={`/clients/${pairing.clientId}`} className="link-accent">
                    {pairing.client.firstName} {pairing.client.lastName}
                  </Link>{" "}
                  <span className="font-normal text-ink/50">with {pairing.coach.name}</span>
                </h3>
                {pairing.sessionAllowance ? (
                  <p className="mt-1 text-sm text-ink/55">
                    {pairing.sessionAllowance.used} of {pairing.sessionAllowance.allowed} planned sessions completed
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-end gap-2">
                {pairing.sessionAllowance ? (
                  <form action="/api/assignments" method="post" className="flex items-end gap-2">
                    <input type="hidden" name="intent" value="adjust_allowance" />
                    <input type="hidden" name="assignmentId" value={pairing.id} />
                    <label className="text-xs text-ink/55">
                      Planned sessions
                      <input
                        type="number"
                        name="allowed"
                        min={pairing.sessionAllowance.used || 1}
                        max={52}
                        defaultValue={pairing.sessionAllowance.allowed}
                        className="field mt-1 w-24"
                      />
                    </label>
                    <button className="btn-secondary">Update</button>
                  </form>
                ) : null}
                <form action="/api/assignments" method="post">
                  <input type="hidden" name="intent" value="end" />
                  <input type="hidden" name="assignmentId" value={pairing.id} />
                  <button className="btn-ghost">End pairing</button>
                </form>
              </div>
            </article>
          ))}
        </div>
      </section>

      <details className="panel mt-10 rounded-xl p-5">
        <summary className="cursor-pointer font-medium">Pair manually</summary>
        <form action="/api/assignments" method="post" className="mt-4 grid max-w-xl gap-4">
          <input type="hidden" name="intent" value="create" />
          <label className="block text-sm font-medium">
            Coach
            <select name="coachId" required className="field" defaultValue="">
              <option value="" disabled>
                Select a coach
              </option>
              {coaches.map((coach) => (
                <option key={coach.coachId} value={coach.coachId}>
                  {coach.name} ({coach.email})
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Student
            <select name="clientId" required className="field" defaultValue="">
              <option value="" disabled>
                Select a student
              </option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.firstName} {client.lastName}
                  {client.assignments[0] ? ` (now with ${client.assignments[0].coach.name})` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Planned sessions
            <input type="number" name="allowed" min={1} max={52} defaultValue={12} className="field" />
          </label>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" name="replaceExisting" value="1" className="mt-1" />
            <span>Replace the student&apos;s current coach</span>
          </label>
          <button className="btn">Create pairing</button>
        </form>
      </details>
    </Shell>
  );
}

function Suggestions({
  suggestions,
  action,
}: {
  suggestions: CoachSuggestion[];
  action: (s: CoachSuggestion) => React.ReactNode;
}) {
  if (suggestions.length === 0) {
    return <p className="mt-4 text-sm text-signal">No active coaches to suggest yet.</p>;
  }
  return (
    <div className="mt-4 grid gap-3 md:grid-cols-3">
      {suggestions.map((s, index) => (
        <div key={s.coachId} className="flex flex-col rounded-lg border border-ink/[0.1] bg-paper/60 p-4">
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-medium">
              {index + 1}. {s.name}
            </p>
            <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent-deep">
              {s.score}% fit
            </span>
          </div>
          <ul className="mt-2 flex-1 space-y-1 text-xs text-ink/60">
            {s.reasons.map((reason) => (
              <li key={reason}>• {reason}</li>
            ))}
          </ul>
          <div className="mt-3">{action(s)}</div>
        </div>
      ))}
    </div>
  );
}
