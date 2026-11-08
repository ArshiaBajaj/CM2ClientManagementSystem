import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isLeadOrAdmin } from "@/lib/access";
import { Guide } from "@/components/guide";
import { Shell } from "@/components/shell";
import { internClearance, internRecord, visibleTaskWhere } from "@/lib/gate";
import { prisma } from "@/lib/db";

export default async function InternHomePage() {
  const user = await getSession();
  if (!user) redirect("/login");
  if (isLeadOrAdmin(user)) redirect("/interns");
  if (user.role !== "intern") redirect("/workspace");

  const intern = await internRecord(user);
  if (!intern) redirect("/intern/start");
  const clearance = await internClearance(intern.id);
  if (!clearance.ready) redirect("/intern/start");

  const [teams, documents, channels, tasks] = await Promise.all([
    prisma.internTeam.findMany({ include: { interns: { orderBy: { firstName: "asc" } } }, orderBy: { name: "asc" } }),
    prisma.internDocument.findMany({
      where: { OR: [{ teamId: null }, { teamId: intern.teamId }] },
      orderBy: { createdAt: "desc" },
      take: 4,
      include: { team: true },
    }),
    prisma.internChannel.findMany({
      where: { OR: [{ kind: { in: ["all", "between"] } }, { teamId: intern.teamId }] },
      include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
    }),
    prisma.internTask.findMany({
      where: { ...visibleTaskWhere(intern.teamId), status: { not: "done" } },
      include: { assignee: true, team: true },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
  ]);

  return (
    <Shell user={user}>
      <p className="label-caps text-accent">{intern.team.name}</p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">Hi, {intern.firstName}</h1>
      <p className="mt-3 max-w-2xl text-ink/65">
        You are on {intern.team.name}. Tasks are the shared work. Chat is for talking. Documents hold the longer notes.
        Coaching notes are not in this space.
      </p>
      <Guide
        steps={[
          { title: "Tasks", body: "Add work for your team or for every intern, then move it from To do to Done." },
          { title: "Chat", body: "Your team channel is private. Between teams is for asking another team. All interns is everyone." },
          { title: "Documents", body: "Share a note with your team, or mark it for all interns. Another team's private notes stay hidden." },
        ]}
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="panel rounded-xl p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold tracking-tight">Teams</h2>
            <Link href="/intern/chat?channel=between" className="link-accent text-sm">
              Message between teams
            </Link>
          </div>
          <ul className="mt-4 space-y-4">
            {teams.map((team) => (
              <li key={team.id} className="rounded-lg border border-ink/10 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-medium">
                    {team.name}
                    {team.id === intern.teamId ? <span className="ml-2 text-xs text-accent">Your team</span> : null}
                  </h3>
                  <p className="text-xs uppercase tracking-[0.14em] text-ink/40">{team.focus}</p>
                </div>
                {team.description ? <p className="mt-1 text-sm text-ink/60">{team.description}</p> : null}
                <p className="mt-2 text-sm text-ink/70">{team.interns.map((member) => member.firstName).join(", ") || "No interns yet"}</p>
              </li>
            ))}
          </ul>
        </section>

        <div className="space-y-4">
          <section className="panel rounded-xl p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold tracking-tight">Open tasks</h2>
              <Link href="/intern/tasks" className="link-accent text-sm">
                Board
              </Link>
            </div>
            <ul className="mt-3 space-y-2 text-sm">
              {tasks.length === 0 ? <li className="text-ink/55">No open tasks. Add one on the board.</li> : null}
              {tasks.map((task) => (
                <li key={task.id}>
                  <Link href={`/intern/tasks?task=${task.id}`} className="block rounded-md p-2 hover:bg-accent/5">
                    <p className="font-medium">{task.title}</p>
                    <p className="text-ink/50">
                      {task.status === "doing" ? "Doing" : "To do"} · {task.team?.name ?? "All interns"}
                      {task.assignee ? ` · ${task.assignee.firstName}` : ""}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          <section className="panel rounded-xl p-5">
            <h2 className="font-display text-xl font-semibold tracking-tight">Latest messages</h2>
            <ul className="mt-3 space-y-3 text-sm">
              {channels.map((channel) => {
                const last = channel.messages[0];
                return (
                  <li key={channel.id}>
                    <Link href={`/intern/chat?channel=${channel.key}`} className="block rounded-md p-2 hover:bg-accent/5">
                      <p className="font-medium">{channel.name}</p>
                      <p className="line-clamp-2 break-words text-ink/55">{last ? `${last.senderName}: ${last.body}` : "No messages yet"}</p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
          <section className="panel rounded-xl p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold tracking-tight">Documents</h2>
              <Link href="/intern/documents" className="link-accent text-sm">
                All
              </Link>
            </div>
            <ul className="mt-3 space-y-2 text-sm">
              {documents.length === 0 ? <li className="text-ink/55">Nothing shared yet.</li> : null}
              {documents.map((doc) => (
                <li key={doc.id}>
                  <Link href="/intern/documents" className="block rounded-md p-2 hover:bg-accent/5">
                    <p className="font-medium">{doc.title}</p>
                    <p className="text-ink/50">{doc.team?.name ?? "All interns"} · {doc.authorName}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </Shell>
  );
}
