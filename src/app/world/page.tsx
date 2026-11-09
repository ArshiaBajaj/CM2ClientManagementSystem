import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getGuardianHouseholdId, isLeadOrAdmin, resolveCoachId } from "@/lib/access";
import { guardClientWorkspace } from "@/lib/gate";
import { prisma } from "@/lib/db";
import { Notice, Shell } from "@/components/shell";
import { LiveRefresh } from "@/components/live-refresh";
import { WorldGlobe } from "@/components/world-globe";
import { COUNTRIES, WORLD_CONSENT, WORLD_INTERESTS, circleAccess, countryCounts } from "@/lib/world";

export default async function WorldPage({
  searchParams,
}: {
  searchParams: Promise<{ circle?: string; notice?: string; error?: string }>;
}) {
  const user = await getSession();
  if (!user) redirect("/login");
  await guardClientWorkspace(user);
  const { circle: circleId, notice, error } = await searchParams;
  const manager = isLeadOrAdmin(user);
  const coachId = user.role === "coach" ? await resolveCoachId(user) : null;

  // Which circles this person can see
  const circles = await prisma.worldCircle.findMany({
    where: manager
      ? { status: { in: ["proposed", "active"] } }
      : user.role === "coach"
        ? { coachId: coachId ?? "__none__", status: "active" }
        : user.role === "client"
          ? { status: "active", members: { some: { clientId: user.clientId ?? "__none__" } } }
          : { id: "__none__" },
    include: { members: true },
    orderBy: { createdAt: "desc" },
  });
  const memberIds = [...new Set(circles.flatMap((c) => c.members.map((m) => m.clientId)))];
  const memberClients = await prisma.client.findMany({
    where: { id: { in: memberIds } },
    select: { id: true, firstName: true, country: true },
  });
  const memberInfo = new Map(memberClients.map((m) => [m.id, m]));

  // Globe: every country with teens, and lines between countries sharing an open circle
  const counts = await countryCounts();
  const links: Array<[string, string]> = [];
  for (const c of circles.filter((c) => c.status === "active")) {
    const countries = [...new Set(c.members.map((m) => memberInfo.get(m.clientId)?.country).filter(Boolean))] as string[];
    for (let i = 1; i < countries.length; i++) links.push([countries[0], countries[i]]);
  }

  const selected = circleId ? await circleAccess(user, circleId) : null;
  const messages = selected
    ? await prisma.worldCircleMessage.findMany({ where: { circleId: selected.id }, orderBy: { createdAt: "asc" }, take: 200 })
    : [];

  const me = user.role === "client" && user.clientId ? await prisma.client.findUnique({ where: { id: user.clientId } }) : null;
  const myConsent = me ? await prisma.consent.findFirst({ where: { clientId: me.id, kind: WORLD_CONSENT } }) : null;
  const myInterests = new Set((me?.worldInterests ?? "").split("|").filter(Boolean));

  const householdId = user.role === "guardian" ? await getGuardianHouseholdId(user) : null;
  const familyTeens = householdId
    ? await prisma.client.findMany({
        where: { householdId, archivedAt: null, program: "cm2" },
        include: { consents: { where: { kind: WORLD_CONSENT } } },
      })
    : [];

  const coaches = manager ? await prisma.coachRoster.findMany({ where: { status: "active" }, orderBy: { name: "asc" } }) : [];
  const pool = manager
    ? await prisma.client.count({ where: { program: "cm2", worldOptIn: true, consents: { some: { kind: WORLD_CONSENT } } } })
    : 0;
  const waitingConsent = manager
    ? await prisma.client.count({ where: { program: "cm2", worldOptIn: true, consents: { none: { kind: WORLD_CONSENT } } } })
    : 0;

  return (
    <Shell user={user}>
      <p className="label-caps text-accent">World View</p>
      <h1 className="mt-2 font-display text-5xl">Teens around the world</h1>
      <p className="mt-3 max-w-2xl text-ink/70">
        Small circles of 3–6 teens from at least two countries who care about the same thing, always with a Coach Me 2
        coach reading along. Members see first names and countries only.
      </p>
      <Notice error={error} notice={notice} />
      {selected ? <LiveRefresh seconds={8} /> : null}

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div>
          <WorldGlobe
            highlight={counts.map((c) => c.country)}
            links={links}
            label={`Globe showing ${counts.length} countries with Coach Me 2 teens and ${links.length} circle connections.`}
          />
          <p className="mt-2 text-center text-xs text-ink/60">Blue: countries with Coach Me 2 teens. Orange lines: open circles.</p>
        </div>

        <div className="space-y-6">
          {/* Student */}
          {me ? (
            <section className="panel rounded-2xl p-6">
              <h2 className="font-display text-3xl">Your World View</h2>
              <p className="mt-1 text-sm text-ink/70">
                {me.worldOptIn
                  ? myConsent
                    ? "You're on the list. We'll match you into a circle soon."
                    : "You're on the list. A parent or guardian needs to say yes in their family portal first."
                  : "Join to be matched with teens in other countries who care about what you care about."}
              </p>
              <form action="/api/world" method="post" className="mt-5 space-y-4">
                <input type="hidden" name="intent" value="profile" />
                <label className="block text-sm font-medium">
                  Your country
                  <select name="country" defaultValue={me.country ?? ""} className="field">
                    <option value="">Choose…</option>
                    {COUNTRIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <fieldset>
                  <legend className="text-sm font-medium">What you care about (up to 3)</legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {WORLD_INTERESTS.map((interest) => (
                      <label key={interest} className="chip">
                        <input type="checkbox" name="interests" value={interest} defaultChecked={myInterests.has(interest)} className="sr-only" />
                        {interest}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label className="flex items-start gap-3 text-sm">
                  <input type="checkbox" name="optIn" value="1" defaultChecked={me.worldOptIn} className="mt-1" />
                  <span>Match me into a circle. I understand my coach and program leads can read circle messages.</span>
                </label>
                <button className="btn">Save</button>
              </form>
            </section>
          ) : null}

          {/* Parent */}
          {user.role === "guardian" ? (
            <section className="panel rounded-2xl p-6">
              <h2 className="font-display text-3xl">Your permission</h2>
              <p className="mt-1 text-sm text-ink/70">
                Circles are moderated by a Coach Me 2 coach. Teens see each other&apos;s first names and countries only, and
                never chat one-on-one. You can withdraw permission at any time.
              </p>
              <ul className="mt-5 space-y-3">
                {familyTeens.map((teen) => {
                  const allowed = teen.consents.length > 0;
                  return (
                    <li key={teen.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink/10 p-4">
                      <span>
                        <span className="font-semibold">{teen.firstName}</span>{" "}
                        <span className="text-sm text-ink/70">
                          · {allowed ? "Allowed" : teen.worldOptIn ? "Asked to join, waiting for you" : "Not joined"}
                        </span>
                      </span>
                      <form action="/api/world" method="post">
                        <input type="hidden" name="intent" value="consent" />
                        <input type="hidden" name="clientId" value={teen.id} />
                        <input type="hidden" name="allow" value={allowed ? "0" : "1"} />
                        <button className={allowed ? "btn-secondary" : "btn"}>{allowed ? "Withdraw permission" : "Allow"}</button>
                      </form>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          {/* Manager tools */}
          {manager ? (
            <section className="panel rounded-2xl p-6">
              <h2 className="font-display text-3xl">Matching</h2>
              <p className="mt-1 text-sm text-ink/70">
                {pool} teen{pool === 1 ? "" : "s"} ready to match · {waitingConsent} waiting for a parent
              </p>
              <form action="/api/world" method="post" className="mt-4">
                <input type="hidden" name="intent" value="propose" />
                <button className="btn">Suggest new circles</button>
              </form>
            </section>
          ) : null}

          {/* Circles */}
          {circles.length > 0 ? (
            <section className="space-y-3">
              <h2 className="font-display text-3xl">{manager ? "Circles" : "Your circles"}</h2>
              {circles.map((c) => (
                <article key={c.id} className="panel rounded-2xl p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="label-caps">{c.status === "proposed" ? "Proposed" : "Open"}</p>
                      <h3 className="mt-1 font-display text-2xl">{c.theme}</h3>
                      <p className="mt-1 text-sm text-ink/70">
                        {c.members
                          .map((m) => memberInfo.get(m.clientId))
                          .filter(Boolean)
                          .map((m) => `${m!.firstName} (${m!.country})`)
                          .join(", ")}
                      </p>
                    </div>
                    {c.status === "active" ? (
                      <Link href={`/world?circle=${c.id}`} className="btn-secondary">
                        Open chat
                      </Link>
                    ) : null}
                  </div>
                  {manager && c.status === "proposed" ? (
                    <form action="/api/world" method="post" className="mt-4 flex flex-wrap items-end gap-3">
                      <input type="hidden" name="intent" value="start" />
                      <input type="hidden" name="circleId" value={c.id} />
                      <label className="block flex-1 text-sm font-medium">
                        Moderating coach
                        <select name="coachId" required className="field" defaultValue="">
                          <option value="" disabled>
                            Choose a coach
                          </option>
                          {coaches.map((coach) => (
                            <option key={coach.coachId} value={coach.coachId}>
                              {coach.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button className="btn">Open circle</button>
                    </form>
                  ) : null}
                  {manager && c.status === "active" ? (
                    <form action="/api/world" method="post" className="mt-3">
                      <input type="hidden" name="intent" value="close" />
                      <input type="hidden" name="circleId" value={c.id} />
                      <button className="btn-ghost px-0 text-xs">Close circle</button>
                    </form>
                  ) : null}
                </article>
              ))}
            </section>
          ) : null}
        </div>
      </div>

      {/* Circle chat */}
      {selected && selected.status === "active" ? (
        <section id="chat" className="panel mt-10 flex min-h-[26rem] flex-col rounded-2xl">
          <header className="border-b border-ink/10 px-6 py-4">
            <h2 className="font-display text-3xl">{selected.theme}</h2>
            <p className="mt-1 text-sm text-ink/70">
              Be kind, stay curious, and keep personal details (last names, schools, socials, phone numbers) to yourself.
              Your moderating coach reads along.
            </p>
          </header>
          <ul className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
            {messages.length === 0 ? <li className="text-sm text-ink/70">Say hello. Where are you, and what are you working on?</li> : null}
            {messages.map((m) => {
              const mine = m.senderId === user.id;
              return (
                <li key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[15px] ${mine ? "bg-ink text-paper" : "bg-paper"}`}>
                    {mine ? null : <p className="text-xs font-semibold text-ink/70">{m.senderName}</p>}
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  </div>
                </li>
              );
            })}
          </ul>
          <form action="/api/world" method="post" className="flex gap-2 border-t border-ink/10 p-4">
            <input type="hidden" name="intent" value="message" />
            <input type="hidden" name="circleId" value={selected.id} />
            <label htmlFor="circle-message" className="sr-only">
              Message
            </label>
            <input id="circle-message" name="body" required maxLength={1000} placeholder="Write to your circle" className="field mt-0 flex-1" />
            <button className="btn">Send</button>
          </form>
        </section>
      ) : null}
    </Shell>
  );
}
