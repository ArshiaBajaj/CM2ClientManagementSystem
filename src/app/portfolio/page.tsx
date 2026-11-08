import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canAccessClient, isStaff } from "@/lib/access";
import { prisma } from "@/lib/db";
import { Notice, Shell } from "@/components/shell";
import { GRADE_YEARS, LEVEL_ORDER, PORTFOLIO_CATEGORIES, PORTFOLIO_LEVELS } from "@/lib/portfolio";
import { VALUES } from "@/lib/values";

export default async function PortfolioPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; error?: string; notice?: string; grade?: string }>;
}) {
  const user = await getSession();
  if (!user) redirect("/login");
  const { clientId: requested, error, notice, grade } = await searchParams;

  let clientId = user.clientId ?? "";
  if (isStaff(user)) {
    if (!requested || !(await canAccessClient(user, requested)).ok) redirect("/clients");
    clientId = requested;
  } else if (user.role !== "client") {
    redirect("/workspace");
  }

  const [client, items, values] = await Promise.all([
    prisma.client.findUnique({ where: { id: clientId } }),
    prisma.portfolioItem.findMany({ where: { clientId }, orderBy: [{ gradeYear: "desc" }, { createdAt: "desc" }] }),
    prisma.valuesResult.findFirst({ where: { clientId }, orderBy: { createdAt: "desc" } }),
  ]);
  if (!client) redirect("/workspace");

  const gradeFilter = Number(grade ?? 0);
  const shown = gradeFilter ? items.filter((i) => i.gradeYear === gradeFilter) : items;
  const totalHours = items.reduce((sum, i) => sum + (i.hours ?? 0), 0);
  const topValueNames = values
    ? values.topValues
        .split(",")
        .slice(0, 3)
        .map((k) => VALUES.find((v) => v.key === k)?.name)
        .filter(Boolean)
    : [];
  const highlights = LEVEL_ORDER.flatMap((level) => items.filter((i) => i.level === level)).slice(0, 3);
  const qs = isStaff(user) ? `clientId=${clientId}&` : "";

  return (
    <Shell user={user}>
      {isStaff(user) ? (
        <p className="text-sm">
          <Link href={`/clients/${client.id}`} className="link-accent">
            ← {client.firstName}&apos;s profile
          </Link>
        </p>
      ) : null}
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-caps text-accent">Portfolio</p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
            {isStaff(user) ? `${client.firstName}'s portfolio` : "My portfolio"}
          </h1>
          <p className="mt-2 max-w-2xl text-ink/60">
            Log every award, activity, and role from freshman year on, so nothing is forgotten when
            it&apos;s time for applications. Each entry is sorted by level automatically.
          </p>
        </div>
        {items.length ? (
          <a href={`/api/portfolio?${qs}`} className="btn-secondary">
            Download activities list
          </a>
        ) : null}
      </div>
      <Notice error={error} notice={notice} />

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="panel rounded-xl p-5">
          <p className="label-caps">Entries</p>
          <p className="mt-2 font-display text-3xl font-semibold tracking-tight">{items.length}</p>
        </div>
        <div className="panel rounded-xl p-5">
          <p className="label-caps">National or higher</p>
          <p className="mt-2 font-display text-3xl font-semibold tracking-tight">
            {items.filter((i) => i.level === "national" || i.level === "international").length}
          </p>
        </div>
        <div className="panel rounded-xl p-5">
          <p className="label-caps">Hours logged</p>
          <p className="mt-2 font-display text-3xl font-semibold tracking-tight">{totalHours}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="min-w-0">
          <nav className="flex flex-wrap gap-2 text-sm">
            {[["0", "All years"], ...Object.entries(GRADE_YEARS)].map(([key, label]) => (
              <Link
                key={key}
                href={`/portfolio?${qs}grade=${key}`}
                className={`rounded-full px-3 py-1.5 ${
                  String(gradeFilter) === key ? "bg-[#1a3350] text-paper" : "border border-ink/15 bg-white"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>

          {shown.length === 0 ? (
            <p className="panel mt-4 rounded-xl p-6 text-ink/60">
              Nothing here yet. Add your first entry, like a club, a job, or an award.
            </p>
          ) : null}
          {LEVEL_ORDER.map((level) => {
            const group = shown.filter((i) => i.level === level);
            if (group.length === 0) return null;
            return (
              <div key={level} className="mt-6">
                <h2 className="label-caps">{PORTFOLIO_LEVELS[level]}</h2>
                <div className="mt-2 space-y-2">
                  {group.map((item) => (
                    <article key={item.id} className="panel rounded-xl p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-medium">{item.title}</h3>
                          <p className="text-xs text-ink/50">
                            {PORTFOLIO_CATEGORIES[item.category as keyof typeof PORTFOLIO_CATEGORIES] ?? item.category} · Grade{" "}
                            {item.gradeYear}
                            {item.hours ? ` · ${item.hours} hrs` : ""}
                            {item.occurredOn ? ` · ${item.occurredOn}` : ""}
                          </p>
                          {item.description ? <p className="mt-1 text-sm text-ink/70">{item.description}</p> : null}
                        </div>
                        <div className="flex items-center gap-1">
                          <form action="/api/portfolio" method="post" className="flex items-center gap-1">
                            <input type="hidden" name="intent" value="level" />
                            <input type="hidden" name="id" value={item.id} />
                            <input type="hidden" name="clientId" value={clientId} />
                            <select name="level" defaultValue={item.level} className="rounded-md border border-ink/15 bg-white px-2 py-1 text-xs" aria-label="Level">
                              {LEVEL_ORDER.map((l) => (
                                <option key={l} value={l}>
                                  {PORTFOLIO_LEVELS[l]}
                                </option>
                              ))}
                            </select>
                            <button className="btn-ghost text-xs">Set</button>
                          </form>
                          <form action="/api/portfolio" method="post">
                            <input type="hidden" name="intent" value="delete" />
                            <input type="hidden" name="id" value={item.id} />
                            <input type="hidden" name="clientId" value={clientId} />
                            <button className="btn-ghost text-xs">Remove</button>
                          </form>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            );
          })}
        </section>

        <aside className="space-y-4">
          <form action="/api/portfolio" method="post" className="panel space-y-3 rounded-xl p-5">
            <input type="hidden" name="intent" value="add" />
            <input type="hidden" name="clientId" value={clientId} />
            <h2 className="font-display text-lg font-semibold tracking-tight">Add an entry</h2>
            <label className="block text-sm font-medium">
              What was it?
              <input name="title" required placeholder="2nd place, State Science Olympiad" className="field" />
            </label>
            <label className="block text-sm font-medium">
              Details <span className="font-normal text-ink/45">(what you did, impact)</span>
              <textarea name="description" rows={3} className="field" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-medium">
                Grade
                <select name="gradeYear" required defaultValue="" className="field">
                  <option value="" disabled>
                    Choose
                  </option>
                  {Object.entries(GRADE_YEARS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium">
                Hours
                <input type="number" name="hours" min={0} className="field" />
              </label>
              <label className="block text-sm font-medium">
                Type
                <select name="category" defaultValue="auto" className="field">
                  <option value="auto">Figure it out</option>
                  {Object.entries(PORTFOLIO_CATEGORIES).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium">
                Level
                <select name="level" defaultValue="auto" className="field">
                  <option value="auto">Figure it out</option>
                  {LEVEL_ORDER.map((l) => (
                    <option key={l} value={l}>
                      {PORTFOLIO_LEVELS[l]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block text-sm font-medium">
              Date
              <input type="date" name="occurredOn" className="field" />
            </label>
            <button className="btn w-full">Add</button>
          </form>

          <section className="panel rounded-xl p-5 text-sm">
            <h2 className="font-display text-lg font-semibold tracking-tight">Personal statement starter</h2>
            {topValueNames.length ? (
              <p className="mt-2 text-ink/70">
                Your top values are <strong>{topValueNames.join(", ")}</strong>. Which entry below shows
                one of them in action? That story is a strong starting point.
              </p>
            ) : (
              <p className="mt-2 text-ink/70">
                Take the{" "}
                <Link href="/values" className="link-accent">
                  values inventory
                </Link>{" "}
                to connect your experiences to what matters to you.
              </p>
            )}
            {highlights.length ? (
              <ul className="mt-3 space-y-1">
                {highlights.map((h) => (
                  <li key={h.id}>• {h.title}</li>
                ))}
              </ul>
            ) : null}
          </section>
        </aside>
      </div>
    </Shell>
  );
}
