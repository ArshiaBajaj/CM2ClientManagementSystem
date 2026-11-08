import type { ProgramUpdate } from "@prisma/client";

const KIND_LABELS: Record<string, string> = {
  podcast: "Podcast",
  research: "Research",
  news: "Program news",
};

/** Podcast episodes, research summaries, and news posted by managers under Website updates. */
export function UpdateCards({ updates }: { updates: ProgramUpdate[] }) {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {updates.map((u) => (
        <article key={u.id} className="panel flex flex-col rounded-xl p-6">
          <p className="label-caps text-accent">{KIND_LABELS[u.kind] ?? u.kind}</p>
          <h3 className="mt-2 font-display text-lg font-semibold tracking-tight">{u.title}</h3>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-ink/65">{u.summary}</p>
          <p className="mt-3 text-xs text-ink/45">
            {u.publishedAt.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
          </p>
          {u.url ? (
            <a href={u.url} target="_blank" rel="noreferrer" className="link-accent mt-2 text-sm">
              {u.kind === "podcast" ? "Listen" : "Read more"} ↗
            </a>
          ) : null}
        </article>
      ))}
    </div>
  );
}
