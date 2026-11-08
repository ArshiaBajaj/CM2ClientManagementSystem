import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isLeadOrAdmin } from "@/lib/access";
import { prisma } from "@/lib/db";
import { Shell } from "@/components/shell";

const KIND_LABELS: Record<string, string> = {
  contact: "Contact form",
  intern_application: "Intern application",
  newsletter: "Quiz / newsletter sign-up",
};

const VIEWS = [
  { key: "new", label: "New" },
  { key: "handled", label: "Handled" },
  { key: "all", label: "All" },
];

/** Everything people send from the public website, for managers. */
export default async function WebsiteInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; kind?: string }>;
}) {
  const user = await getSession();
  if (!user) redirect("/login");
  if (!isLeadOrAdmin(user)) redirect("/workspace");
  const { view: rawView, kind } = await searchParams;
  const view = VIEWS.some((v) => v.key === rawView) ? (rawView as string) : "new";

  const [items, newCount] = await Promise.all([
    prisma.siteInquiry.findMany({
      where: {
        ...(view === "all" ? {} : { status: view }),
        ...(kind && KIND_LABELS[kind] ? { kind } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.siteInquiry.count({ where: { status: "new" } }),
  ]);

  return (
    <Shell user={user}>
      <h1 className="font-display text-4xl">Website inbox</h1>
      <p className="mt-3 max-w-2xl text-ink/70">
        Messages from CoachMe2.world: the contact form, intern applications, and people who joined the list after the
        check-in quiz. Coach requests from the Get a coach form are on the{" "}
        <Link href="/matching" className="link-accent">
          Matching
        </Link>{" "}
        page.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {VIEWS.map((v) => (
          <Link
            key={v.key}
            href={`/inbox?view=${v.key}${kind ? `&kind=${kind}` : ""}`}
            aria-current={view === v.key ? "true" : undefined}
            className={`rounded-full border px-4 py-1.5 text-sm ${
              view === v.key ? "border-accent bg-accent text-white" : "border-ink/15 bg-white"
            }`}
          >
            {v.label}
            {v.key === "new" && newCount > 0 ? ` (${newCount})` : ""}
          </Link>
        ))}
        <span className="mx-2 h-5 w-px bg-ink/15" aria-hidden />
        {Object.entries(KIND_LABELS).map(([key, label]) => (
          <Link
            key={key}
            href={kind === key ? `/inbox?view=${view}` : `/inbox?view=${view}&kind=${key}`}
            aria-current={kind === key ? "true" : undefined}
            className={`rounded-full border px-3 py-1.5 text-xs ${
              kind === key ? "border-ink bg-ink text-white" : "border-ink/15 bg-white text-ink/70"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="panel mt-6 rounded-xl p-6 text-ink/60">Nothing here.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {items.map((item) => {
            let details: Record<string, string> = {};
            try {
              details = JSON.parse(item.detailsJson) as Record<string, string>;
            } catch {
              details = {};
            }
            return (
              <li key={item.id} className="panel rounded-xl p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="label-caps text-accent">
                      {KIND_LABELS[item.kind] ?? item.kind}
                      {item.topic ? ` · ${item.topic}` : ""}
                    </p>
                    <p className="mt-1 font-semibold">
                      {item.name || "No name"}{" "}
                      <a href={`mailto:${item.email}`} className="font-normal text-accent-deep underline">
                        {item.email}
                      </a>
                    </p>
                    <p className="text-xs text-ink/50">{item.createdAt.toLocaleString()}</p>
                  </div>
                  <form action="/api/site/inquiries" method="post">
                    <input type="hidden" name="intent" value="status" />
                    <input type="hidden" name="id" value={item.id} />
                    <input type="hidden" name="view" value={view} />
                    <input type="hidden" name="status" value={item.status === "new" ? "handled" : "new"} />
                    <button className="btn-secondary px-3 py-1.5 text-xs">
                      {item.status === "new" ? "Mark handled" : "Move back to new"}
                    </button>
                  </form>
                </div>
                {item.message ? <p className="mt-3 whitespace-pre-wrap text-sm text-ink/80">{item.message}</p> : null}
                {Object.keys(details).length > 0 ? (
                  <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-ink/60">
                    {Object.entries(details).map(([k, v]) => (
                      <div key={k}>
                        <dt className="inline font-semibold capitalize">{k}:</dt> <dd className="inline">{v}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </Shell>
  );
}
