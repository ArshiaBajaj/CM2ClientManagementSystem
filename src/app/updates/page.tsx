import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isLeadOrAdmin } from "@/lib/access";
import { prisma } from "@/lib/db";
import { Notice, Shell } from "@/components/shell";

export default async function UpdatesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const user = await getSession();
  if (!user) redirect("/login");
  if (!isLeadOrAdmin(user)) redirect("/workspace");
  const { error, notice } = await searchParams;
  const updates = await prisma.programUpdate.findMany({ orderBy: { publishedAt: "desc" } });

  return (
    <Shell user={user}>
      <p className="label-caps text-accent">Website</p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">Podcast and research updates</h1>
      <p className="mt-3 max-w-2xl text-ink/60">
        Updates appear on the public home page and in the feed at{" "}
        <code className="rounded bg-ink/[0.06] px-1.5 py-0.5 text-xs">/api/public/updates</code>, which
        the main Coach Me 2 website can pull in. Set the website, podcast, and research links in
        Settings.
      </p>
      <Notice error={error} notice={notice} />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="space-y-3">
          {updates.length === 0 ? <p className="panel rounded-xl p-5 text-ink/55">Nothing published yet.</p> : null}
          {updates.map((u) => (
            <article key={u.id} className="panel rounded-xl p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="label-caps text-accent">
                    {u.kind} {u.published ? "" : "· hidden"}
                  </p>
                  <h2 className="mt-1 font-display text-lg font-semibold tracking-tight">{u.title}</h2>
                  <p className="mt-1 text-sm text-ink/60">{u.summary}</p>
                  {u.url ? (
                    <a href={u.url} target="_blank" rel="noreferrer" className="link-accent mt-2 inline-block text-sm">
                      {u.url}
                    </a>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <form action="/api/updates" method="post">
                    <input type="hidden" name="intent" value="toggle" />
                    <input type="hidden" name="id" value={u.id} />
                    <button className="btn-secondary">{u.published ? "Hide" : "Publish"}</button>
                  </form>
                  <form action="/api/updates" method="post">
                    <input type="hidden" name="intent" value="delete" />
                    <input type="hidden" name="id" value={u.id} />
                    <button className="btn-ghost">Delete</button>
                  </form>
                </div>
              </div>
            </article>
          ))}
        </section>

        <form action="/api/updates" method="post" className="panel h-fit space-y-4 rounded-xl p-6">
          <h2 className="font-display text-xl font-semibold tracking-tight">New update</h2>
          <label className="block text-sm font-medium">
            Type
            <select name="kind" className="field" defaultValue="podcast">
              <option value="podcast">Podcast episode</option>
              <option value="research">Research summary</option>
              <option value="news">Program news</option>
            </select>
          </label>
          <label className="block text-sm font-medium">
            Title
            <input name="title" required className="field" />
          </label>
          <label className="block text-sm font-medium">
            Summary
            <textarea name="summary" rows={4} className="field" placeholder="What interns found, or what the episode covers" />
          </label>
          <label className="block text-sm font-medium">
            Link
            <input name="url" type="url" placeholder="https://" className="field" />
          </label>
          <button className="btn w-full">Publish</button>
        </form>
      </div>
    </Shell>
  );
}
