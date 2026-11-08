import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canAccessClient, isLeadOrAdmin, resolveCoachId } from "@/lib/access";
import { guardClientWorkspace } from "@/lib/gate";
import { prisma } from "@/lib/db";
import { Shell } from "@/components/shell";

export default async function ChatThreadPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getSession();
  if (!user) redirect("/login");
  await guardClientWorkspace(user);
  if (user.role === "guardian") redirect("/workspace");

  const { id } = await params;
  const { error } = await searchParams;

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      client: {
        include: {
          household: { include: { guardians: true } },
          assignments: { where: { status: "active" }, include: { coach: true } },
        },
      },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!conversation) notFound();

  const access = await canAccessClient(user, conversation.clientId);
  if (!access.ok && !isLeadOrAdmin(user)) redirect("/chat");

  if (user.role === "coach") {
    const coachId = await resolveCoachId(user);
    if (conversation.coachId !== coachId) redirect("/chat");
  }
  if (user.role === "client" && user.clientId !== conversation.clientId) redirect("/chat");

  const coach = await prisma.coachRoster.findUnique({ where: { coachId: conversation.coachId } });
  const client = conversation.client;
  const meetingUrl =
    client.assignments[0]
      ? `https://zoom.us/j/cm2-${client.publicId.replace("CM2-", "")}`
      : null;

  return (
    <Shell user={user}>
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <section className="rounded-2xl border border-ink/10 bg-white">
          <div className="flex items-center justify-between border-b border-ink/10 px-5 py-4">
            <div>
              <Link href="/chat" className="text-sm text-ink/50 underline">
                All chats
              </Link>
              <h1 className="font-display text-2xl">
                {client.firstName} {client.lastName}
              </h1>
            </div>
            <form action="/api/conversations" method="post">
              <input type="hidden" name="conversationId" value={conversation.id} />
              <input
                type="hidden"
                name="intent"
                value={conversation.status === "archived" ? "reopen" : "archive"}
              />
              <button className="rounded-full border border-ink/15 px-3 py-1.5 text-sm">
                {conversation.status === "archived" ? "Reopen" : "Archive"}
              </button>
            </form>
          </div>
          {error ? <p className="px-5 pt-3 text-sm text-clay">{error}</p> : null}
          <div className="max-h-[28rem] space-y-3 overflow-y-auto px-5 py-4">
            {conversation.messages.map((message) => {
              const mine =
                message.senderId === user.id ||
                (user.role === "client" ? message.senderRole === "client" : message.senderRole !== "client");
              return (
                <div
                  key={message.id}
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                    mine ? "ml-auto bg-[#3b7fc4] text-white" : "bg-paper"
                  }`}
                >
                  <p className="text-xs opacity-70">
                    {message.senderName} · {message.createdAt.toLocaleString()}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{message.body}</p>
                </div>
              );
            })}
          </div>
          {conversation.status === "active" ? (
            <form action="/api/messages" method="post" className="border-t border-ink/10 p-4">
              <input type="hidden" name="conversationId" value={conversation.id} />
              <textarea
                name="body"
                required
                rows={3}
                placeholder="Write a message…"
                className="w-full rounded-lg border border-ink/15 bg-paper px-3 py-2"
              />
              <button className="mt-3 rounded-full bg-moss px-4 py-2 text-sm text-paper">Send</button>
            </form>
          ) : (
            <p className="border-t border-ink/10 p-4 text-sm text-ink/60">This conversation is archived.</p>
          )}
        </section>

        <aside className="rounded-2xl border border-ink/10 bg-white p-5">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#1a3350] text-lg font-semibold text-paper">
            {client.firstName[0]}
            {client.lastName[0]}
          </div>
          <h2 className="mt-3 text-center font-display text-xl">
            {client.firstName} {client.lastName}
          </h2>
          <p className="text-center text-sm text-ink/55">{client.publicId}</p>
          <p className="mt-3 text-sm text-ink/70">{client.phone ?? "No phone"}</p>
          <p className="text-sm text-ink/70">{client.email ?? "No email"}</p>
          <p className="mt-2 text-xs text-ink/50">Coach: {coach?.name ?? "—"}</p>

          {meetingUrl ? (
            <a
              href={meetingUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#3b7fc4] px-4 py-3 text-sm text-white"
            >
              Video call
            </a>
          ) : null}

          <Link
            href={`/clients/${client.id}`}
            className="mt-3 block text-center text-sm text-moss underline"
          >
            Open full profile
          </Link>

          <div className="mt-5 border-t border-ink/10 pt-4 text-sm">
            <p className="text-xs uppercase tracking-[0.16em] text-ink/45">Emergency contact</p>
            <p className="mt-2 font-medium">{client.emergencyContactName ?? "—"}</p>
            <p className="text-ink/60">{client.emergencyContactPhone}</p>
            <p className="text-ink/60">{client.emergencyContactEmail}</p>
            <p className="mt-3 text-xs text-ink/45">
              Parents do not see this confidential chat thread.
            </p>
          </div>
        </aside>
      </div>
    </Shell>
  );
}
