import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isLeadOrAdmin } from "@/lib/access";
import { Notice, Shell } from "@/components/shell";
import { ensureProgramChannels, ensureTeamChannel, internClearance, internRecord } from "@/lib/gate";
import { prisma } from "@/lib/db";
import { LiveRefresh } from "@/components/live-refresh";

export default async function InternChatPage({
  searchParams,
}: {
  searchParams: Promise<{ channel?: string; error?: string; notice?: string }>;
}) {
  const user = await getSession();
  if (!user) redirect("/login");
  const manager = isLeadOrAdmin(user);
  if (!manager && user.role !== "intern") redirect("/workspace");

  const intern = user.role === "intern" ? await internRecord(user) : null;
  if (user.role === "intern") {
    if (!intern) redirect("/intern/start");
    if (!(await internClearance(intern.id)).ready) redirect("/intern/start");
  }

  await ensureProgramChannels();
  if (intern) await ensureTeamChannel(intern.teamId, intern.team.name);

  const { channel: channelKey, error, notice } = await searchParams;
  const channels = await prisma.internChannel.findMany({
    where: manager
      ? {}
      : {
          OR: [
            { kind: { in: ["all", "between"] } },
            { kind: "team", teamId: intern?.teamId ?? "" },
            { kind: "direct", memberIds: { contains: intern?.id ?? "__none__" } },
          ],
        },
    orderBy: { name: "asc" },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  const groupChannels = channels.filter((channel) => channel.kind !== "direct");
  const directChannels = channels.filter((channel) => channel.kind === "direct");
  // Interns who can be messaged: everyone else whose forms are signed.
  const classmates = intern
    ? await prisma.intern.findMany({
        where: { status: "active", id: { not: intern.id } },
        include: { team: true },
        orderBy: { firstName: "asc" },
      })
    : [];
  const requested = channels.find((channel) => channel.key === channelKey);
  const selected = requested ?? channels.find((channel) => channel.kind === "team") ?? channels[0];
  if (channelKey && !requested && selected) {
    redirect(`${manager ? "/interns/chat" : "/intern/chat"}?channel=${selected.key}`);
  }

  return (
    <Shell user={user}>
      <p className="label-caps text-accent">Interns</p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">Team chat</h1>
      <p className="mt-2 max-w-2xl text-ink/60">
        Talk with your own team, with every intern, between teams, or one-on-one with another intern. Another
        team&apos;s private channel stays theirs. Program managers can read every channel, including direct messages.
      </p>
      <LiveRefresh />
      <Notice error={error} notice={notice} />

      <div className="mt-6 grid gap-6 lg:grid-cols-[240px_1fr]">
        <nav className="flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-1 lg:overflow-visible lg:pb-0">
          <p className="label-caps hidden px-3 pb-1 lg:block">Channels</p>
          {groupChannels.map((channel) => (
            <ChannelLink key={channel.id} channel={channel} selected={selected?.id === channel.id} manager={manager} />
          ))}
          <p className="label-caps hidden px-3 pb-1 pt-4 lg:block">Direct messages</p>
          {directChannels.map((channel) => (
            <ChannelLink key={channel.id} channel={channel} selected={selected?.id === channel.id} manager={manager} />
          ))}
          {intern ? (
            <form action="/api/interns" method="post" className="min-w-[14rem] shrink-0 rounded-lg bg-white p-2 lg:mt-2 lg:min-w-0 lg:bg-transparent lg:p-0 lg:px-1">
              <input type="hidden" name="intent" value="direct" />
              <label className="sr-only" htmlFor="dm-intern">
                Message an intern
              </label>
              <select id="dm-intern" name="internId" required defaultValue="" className="field mt-0 py-2 text-xs">
                <option value="" disabled>
                  Message an intern…
                </option>
                {classmates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName} · {c.team.name}
                  </option>
                ))}
              </select>
              <button className="btn-secondary mt-2 w-full py-1.5 text-xs">Open conversation</button>
            </form>
          ) : directChannels.length === 0 ? (
            <p className="hidden px-3 text-xs text-ink/45 lg:block">No direct messages yet.</p>
          ) : null}
        </nav>

        {selected ? (
          <section className="panel flex min-h-[28rem] flex-col rounded-xl">
            <header className="border-b border-ink/10 px-5 py-4">
              <h2 className="font-display text-xl font-semibold tracking-tight">{selected.name}</h2>
              <p className="mt-1 text-sm text-ink/55">
                {selected.kind === "direct"
                  ? "A one-on-one conversation. Program managers can also read it, like every intern channel."
                  : selected.kind === "team"
                  ? "Only this team and program managers can read this channel."
                  : selected.kind === "between"
                    ? "Use this when one team needs something from another. Every intern can read it."
                    : "Everyone in the intern program can read this, including managers."}
              </p>
            </header>
            <ul className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {selected.messages.length === 0 ? <li className="text-sm text-ink/55">Start the conversation.</li> : null}
              {selected.messages.map((message) => {
                const mine = message.senderId === user.id;
                return (
                  <li key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] break-words rounded-2xl px-3 py-2 text-sm ${mine ? "bg-accent text-white" : "bg-paper text-ink"}`}>
                      {mine ? null : <p className="text-xs font-medium text-ink/50">{message.senderName}</p>}
                      <p className="whitespace-pre-wrap">{message.body}</p>
                      <p className={`mt-1 text-[11px] ${mine ? "text-white/70" : "text-ink/40"}`}>
                        {message.createdAt.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
            <form action="/api/interns" method="post" className="flex gap-2 border-t border-ink/10 p-4">
              <input type="hidden" name="intent" value="message" />
              <input type="hidden" name="channelId" value={selected.id} />
              <input type="hidden" name="returnTo" value={manager ? "/interns/chat" : "/intern/chat"} />
              <input name="body" required maxLength={2000} placeholder="Write a message" className="field mt-0 flex-1" />
              <button className="btn">Send</button>
            </form>
          </section>
        ) : (
          <p className="text-ink/55">No channels yet.</p>
        )}
      </div>
    </Shell>
  );
}

function ChannelLink({
  channel,
  selected,
  manager,
}: {
  channel: { key: string; name: string; kind: string };
  selected: boolean;
  manager: boolean;
}) {
  return (
    <Link
      href={`${manager ? "/interns/chat" : "/intern/chat"}?channel=${channel.key}`}
      className={`block min-w-[11rem] shrink-0 rounded-lg px-3 py-2 text-sm lg:min-w-0 ${selected ? "bg-accent/10 font-medium text-accent-deep" : "bg-white hover:bg-ink/[0.04] lg:bg-transparent"}`}
    >
      {channel.name}
      <span className="mt-0.5 block text-xs font-normal text-ink/45">
        {channel.kind === "direct"
          ? "Direct message"
          : channel.kind === "team"
            ? manager
              ? "One team and managers"
              : "Your team and managers"
            : channel.kind === "between"
              ? "Every team"
              : "Every intern"}
      </span>
    </Link>
  );
}
