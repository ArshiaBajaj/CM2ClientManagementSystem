import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isLeadOrAdmin, journalVisibleTo, resolveCoachId } from "@/lib/access";
import { guardClientWorkspace } from "@/lib/gate";
import { prisma } from "@/lib/db";
import { clientScope } from "@/lib/caseload";
import { Shell } from "@/components/shell";

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; clientId?: string }>;
}) {
  const user = await getSession();
  if (!user) redirect("/login");
  await guardClientWorkspace(user);
  if (user.role === "guardian") redirect("/workspace?error=Parents%20cannot%20open%20student%20journals");

  const { error, clientId: focusClientId } = await searchParams;
  const coachId = user.role === "coach" ? await resolveCoachId(user) : null;

  const allowedClients =
    user.role === "client" && user.clientId
      ? await prisma.client.findMany({ where: { id: user.clientId } })
      : user.role === "coach" && coachId
        ? await prisma.client.findMany({
            where: {
              archivedAt: null,
              ...(await clientScope(user, coachId)),
            },
            orderBy: { lastName: "asc" },
          })
        : isLeadOrAdmin(user)
          ? await prisma.client.findMany({
              where: { archivedAt: null, program: "cm2" },
              orderBy: { lastName: "asc" },
            })
          : [];

  const focused = allowedClients.filter((c) => c.id === focusClientId);
  const clients = focused.length > 0 ? focused : allowedClients;

  const entries = await prisma.journalEntry.findMany({
    where: {
      clientId: { in: clients.map((c) => c.id) },
    },
    include: { client: true },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  const visible = entries.filter((entry) =>
    journalVisibleTo(user, entry.visibility, entry.authorRole),
  );

  const defaultClientId = user.clientId ?? clients[0]?.id;

  return (
    <Shell user={user}>
      <h1 className="font-display text-4xl">Journal</h1>
      <p className="mt-2 max-w-2xl text-ink/70">
        Shared notebook for student and coach — like a living Google Doc with AI training signals.
        Parents never see this surface.
      </p>
      {error ? <p className="mt-4 text-sm text-clay">{error}</p> : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          {visible.length === 0 ? <p className="text-ink/60">No journal entries yet.</p> : null}
          {visible.map((entry) => (
            <article key={entry.id} className="rounded-2xl border border-ink/10 bg-white p-5">
              <p className="text-xs text-ink/50">
                {entry.client.firstName} {entry.client.lastName} · {entry.client.publicId} ·{" "}
                {entry.authorName} · {entry.visibility}
              </p>
              <h2 className="mt-1 font-display text-xl">{entry.title}</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-ink/80">{entry.body}</p>
              {entry.resourceUrl ? (
                <a
                  href={entry.resourceUrl}
                  className="mt-3 inline-block text-sm text-moss underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Attached resource
                </a>
              ) : null}
              {entry.aiAssessment ? (
                <p className="mt-3 rounded-xl bg-paper px-3 py-2 text-xs text-ink/65">
                  AI assessment: {entry.aiAssessment}
                </p>
              ) : null}
            </article>
          ))}
        </section>

        <section className="rounded-2xl border border-ink/10 bg-white p-5">
          <h2 className="font-display text-2xl">New entry</h2>
          {defaultClientId ? (
            <form action="/api/journal" method="post" className="mt-4 space-y-3">
              {user.role !== "client" ? (
                <label className="block text-sm">
                  Student
                  <select
                    name="clientId"
                    className="mt-2 w-full rounded-lg border border-ink/15 bg-paper px-3 py-2"
                    defaultValue={defaultClientId}
                  >
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.firstName} {client.lastName}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <input type="hidden" name="clientId" value={defaultClientId} />
              )}
              <label className="block text-sm">
                Title
                <input
                  name="title"
                  className="mt-2 w-full rounded-lg border border-ink/15 bg-paper px-3 py-2"
                  placeholder="SAT block reflection"
                />
              </label>
              <label className="block text-sm">
                Entry
                <textarea
                  name="body"
                  required
                  rows={6}
                  className="mt-2 w-full rounded-lg border border-ink/15 bg-paper px-3 py-2"
                />
              </label>
              {user.role !== "client" ? (
                <>
                  <label className="block text-sm">
                    Resource URL (optional)
                    <input
                      name="resourceUrl"
                      className="mt-2 w-full rounded-lg border border-ink/15 bg-paper px-3 py-2"
                      placeholder="https://…"
                    />
                  </label>
                  <label className="block text-sm">
                    Visibility
                    <select
                      name="visibility"
                      defaultValue="shared"
                      className="mt-2 w-full rounded-lg border border-ink/15 bg-paper px-3 py-2"
                    >
                      <option value="shared">Shared with student</option>
                      <option value="coach_only">Coach only</option>
                    </select>
                  </label>
                </>
              ) : (
                <input type="hidden" name="visibility" value="shared" />
              )}
              <button className="rounded-full bg-moss px-4 py-2 text-sm text-paper">Save entry</button>
            </form>
          ) : (
            <p className="mt-4 text-sm text-ink/60">No client notebook available.</p>
          )}
          {clients[0] ? (
            <Link
              href={`/clients/${clients[0].id}/journal`}
              className="mt-4 inline-block text-sm text-moss underline"
            >
              Open notebook on client profile
            </Link>
          ) : null}
        </section>
      </div>
    </Shell>
  );
}
