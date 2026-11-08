import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isLeadOrAdmin, resolveCoachId } from "@/lib/access";
import { guardClientWorkspace } from "@/lib/gate";
import { prisma } from "@/lib/db";
import { Shell } from "@/components/shell";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; error?: string }>;
}) {
  const user = await getSession();
  if (!user) redirect("/login");
  await guardClientWorkspace(user);
  if (user.role === "guardian") redirect("/workspace?error=Parents%20use%20family%20home%20only");

  const { q, status, error } = await searchParams;
  const filter = status ?? "active";
  const coachId = user.role === "coach" ? await resolveCoachId(user) : null;

  const conversations = await prisma.conversation.findMany({
    where: {
      status: filter === "all" ? undefined : filter,
      ...(user.role === "coach" && coachId ? { coachId } : {}),
      ...(user.role === "client" && user.clientId ? { clientId: user.clientId } : {}),
      ...(q
        ? {
            OR: [
              { client: { firstName: { contains: q, mode: "insensitive" } } },
              { client: { lastName: { contains: q, mode: "insensitive" } } },
              { client: { publicId: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: {
      client: true,
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { lastMessageAt: "desc" },
  });

  const coaches =
    isLeadOrAdmin(user) || user.role === "client"
      ? await prisma.coachRoster.findMany({ where: { status: "active" }, orderBy: { name: "asc" } })
      : [];

  const assignedClients =
    user.role === "coach" && coachId
      ? await prisma.client.findMany({
          where: {
            archivedAt: null,
            assignments: { some: { coachId, status: "active" } },
          },
          orderBy: { lastName: "asc" },
        })
      : isLeadOrAdmin(user)
        ? await prisma.client.findMany({
            where: { archivedAt: null },
            orderBy: { lastName: "asc" },
          })
        : [];

  return (
    <Shell user={user}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">Chat</h1>
          <p className="mt-2 text-ink/70">Search people and continue coach ↔ client threads.</p>
        </div>
      </div>
      {error ? <p className="mt-4 text-sm text-clay">{error}</p> : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
        <section className="rounded-2xl border border-ink/10 bg-white p-4">
          <form className="space-y-3">
            <input
              name="q"
              defaultValue={q}
              placeholder="Search conversations…"
              className="w-full rounded-lg border border-ink/15 bg-paper px-3 py-2 text-sm"
            />
            <select
              name="status"
              defaultValue={filter}
              className="w-full rounded-lg border border-ink/15 bg-paper px-3 py-2 text-sm"
            >
              <option value="active">Active</option>
              <option value="archived">Archived</option>
              <option value="all">All</option>
            </select>
            <button className="rounded-full bg-moss px-4 py-2 text-sm text-paper">Search</button>
          </form>

          <div className="mt-4 space-y-2">
            {conversations.length === 0 ? (
              <p className="text-sm text-ink/60">No conversations yet.</p>
            ) : null}
            {conversations.map((c) => (
              <Link
                key={c.id}
                href={`/chat/${c.id}`}
                className="block rounded-xl border border-ink/10 px-3 py-3 hover:bg-paper/80"
              >
                <p className="font-medium">
                  {c.client.firstName} {c.client.lastName}
                </p>
                <p className="text-xs text-ink/50">{c.client.publicId}</p>
                <p className="mt-1 line-clamp-1 text-sm text-ink/65">
                  {c.messages[0]?.body ?? "No messages yet"}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-ink/10 bg-white p-5">
          <h2 className="font-display text-2xl">Start or continue</h2>
          {(user.role === "coach" || isLeadOrAdmin(user)) && assignedClients.length > 0 ? (
            <form action="/api/messages" method="post" className="mt-4 space-y-3">
              <label className="block text-sm">
                Client
                <select
                  name="clientId"
                  required
                  className="mt-2 w-full rounded-lg border border-ink/15 bg-paper px-3 py-2"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select client
                  </option>
                  {assignedClients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.firstName} {client.lastName} · {client.publicId}
                    </option>
                  ))}
                </select>
              </label>
              {isLeadOrAdmin(user) ? (
                <label className="block text-sm">
                  Coach
                  <select
                    name="coachId"
                    required
                    className="mt-2 w-full rounded-lg border border-ink/15 bg-paper px-3 py-2"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Select coach
                    </option>
                    {coaches.map((coach) => (
                      <option key={coach.coachId} value={coach.coachId}>
                        {coach.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <textarea
                name="body"
                required
                rows={4}
                placeholder="Write a message…"
                className="w-full rounded-lg border border-ink/15 bg-paper px-3 py-2"
              />
              <button className="rounded-full bg-moss px-4 py-2 text-sm text-paper">Send</button>
            </form>
          ) : user.role === "client" && user.clientId ? (
            <form action="/api/messages" method="post" className="mt-4 space-y-3">
              <input type="hidden" name="clientId" value={user.clientId} />
              <textarea
                name="body"
                required
                rows={4}
                placeholder="Message your coach…"
                className="w-full rounded-lg border border-ink/15 bg-paper px-3 py-2"
              />
              <button className="rounded-full bg-moss px-4 py-2 text-sm text-paper">Send</button>
            </form>
          ) : (
            <p className="mt-4 text-sm text-ink/60">No assigned clients to message yet.</p>
          )}
        </section>
      </div>
    </Shell>
  );
}
