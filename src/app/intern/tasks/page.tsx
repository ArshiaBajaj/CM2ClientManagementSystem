import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isLeadOrAdmin } from "@/lib/access";
import { Guide } from "@/components/guide";
import { Notice, Shell } from "@/components/shell";
import { internClearance, internRecord, visibleTaskWhere } from "@/lib/gate";
import { prisma } from "@/lib/db";

const COLUMNS = [
  { status: "todo", label: "To do", hint: "Not started" },
  { status: "doing", label: "Doing", hint: "Someone is on it" },
  { status: "done", label: "Done", hint: "Finished" },
] as const;

function dueLabel(dueOn: string) {
  if (!dueOn) return "";
  const [year, month, day] = dueOn.split("-").map(Number);
  if (!year || !month || !day) return dueOn;
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default async function InternTasksPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string; task?: string }>;
}) {
  const user = await getSession();
  if (!user) redirect("/login");
  const manager = isLeadOrAdmin(user);
  const intern = user.role === "intern" ? await internRecord(user) : null;
  if (!manager && user.role !== "intern") redirect("/workspace");
  if (intern && !(await internClearance(intern.id)).ready) redirect("/intern/start");
  if (!manager && !intern) redirect("/intern/start");

  const { error, notice, task: selectedId } = await searchParams;
  const [tasks, people, teams] = await Promise.all([
    prisma.internTask.findMany({
      where: manager ? {} : visibleTaskWhere(intern!.teamId),
      include: { team: true, assignee: true, notes: { orderBy: { createdAt: "asc" } } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.intern.findMany({ orderBy: [{ firstName: "asc" }, { lastName: "asc" }], include: { team: true } }),
    prisma.internTeam.findMany({ orderBy: { name: "asc" } }),
  ]);

  const selected = tasks.find((task) => task.id === selectedId) ?? null;

  return (
    <Shell user={user}>
      <p className="label-caps text-accent">{manager ? "All teams" : intern?.team.name}</p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">Tasks</h1>
      <p className="mt-3 max-w-2xl text-ink/65">
        Put the work on the board so it is not stuck in chat. A team task stays with that team. A task for all interns
        is visible to every intern who has finished their forms. Coaching notes are not here.
      </p>
      <Notice error={error} notice={notice} />
      <Guide
        steps={[
          { title: "Add the work", body: "Give it a title, who it is for, and a due date if it has one." },
          { title: "Move it", body: "To do, Doing, then Done. Anyone who can see the task can move it." },
          { title: "Leave a note", body: "Notes stay on the task. Use team chat when the whole channel should hear it." },
        ]}
      />

      <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <form action="/api/interns" method="post" className="panel grid gap-3 rounded-xl p-5 md:grid-cols-2">
            <input type="hidden" name="intent" value="task" />
            <h2 className="font-display text-xl font-semibold tracking-tight md:col-span-2">Add a task</h2>
            <label className="block text-sm font-medium md:col-span-2">
              Title
              <input name="title" required maxLength={140} placeholder="What needs doing?" className="field" />
            </label>
            <label className="block text-sm font-medium md:col-span-2">
              Details
              <textarea name="detail" rows={2} placeholder="Optional. What done looks like." className="field" />
            </label>
            <label className="block text-sm font-medium">
              Who can see it
              <select name="audience" className="field" defaultValue={manager ? "all" : "team"}>
                {manager ? (
                  teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name} only
                    </option>
                  ))
                ) : (
                  <option value="team">My team · {intern?.team.name}</option>
                )}
                <option value="all">All interns</option>
              </select>
            </label>
            <label className="block text-sm font-medium">
              Assign to
              <select name="assigneeId" className="field" defaultValue="">
                <option value="">No one yet</option>
                {people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.firstName} {person.lastName} · {person.team.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium">
              Due date
              <input name="dueOn" type="date" className="field" />
            </label>
            <div className="flex items-end">
              <button className="btn">Add task</button>
            </div>
            <p className="text-sm text-ink/55 md:col-span-2">
              A team task can only be assigned to someone on that team. An all-interns task can be assigned to anyone.
            </p>
          </form>

          <div className="grid gap-4 lg:grid-cols-3">
            {COLUMNS.map((column) => {
              const items = tasks.filter((task) => task.status === column.status);
              return (
                <section key={column.status} className="rounded-xl border border-ink/10 bg-white/70 p-3">
                  <h2 className="px-1 font-display text-lg font-semibold tracking-tight">{column.label}</h2>
                  <p className="px-1 text-xs text-ink/45">{column.hint}</p>
                  <ul className="mt-3 space-y-2">
                    {items.length === 0 ? <li className="px-1 py-3 text-sm text-ink/45">Nothing here.</li> : null}
                    {items.map((task) => {
                      const open = task.id === selected?.id;
                      return (
                        <li key={task.id}>
                          <Link
                            href={`/intern/tasks?task=${task.id}`}
                            className={`block rounded-lg border p-3 ${open ? "border-accent bg-accent/5" : "border-ink/10 bg-white hover:border-accent/40"}`}
                          >
                            <p className="font-medium leading-snug">{task.title}</p>
                            <p className="mt-1 text-xs text-ink/50">
                              {task.team?.name ?? "All interns"}
                              {task.assignee ? ` · ${task.assignee.firstName}` : " · Unassigned"}
                              {task.dueOn ? ` · Due ${dueLabel(task.dueOn)}` : ""}
                            </p>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        </div>

        <aside className="panel h-fit rounded-xl p-5">
          {selected ? (
            <>
              <p className="label-caps text-accent">{selected.team?.name ?? "All interns"}</p>
              <h2 className="mt-2 font-display text-xl font-semibold tracking-tight">{selected.title}</h2>
              <p className="mt-2 text-sm text-ink/60">
                {selected.assignee ? `${selected.assignee.firstName} ${selected.assignee.lastName}` : "Unassigned"}
                {selected.dueOn ? ` · Due ${dueLabel(selected.dueOn)}` : ""}
                {" · "}Added by {selected.authorName}
              </p>
              {selected.detail ? (
                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink/75">{selected.detail}</p>
              ) : (
                <p className="mt-3 text-sm text-ink/45">No extra details.</p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {COLUMNS.filter((column) => column.status !== selected.status).map((column) => (
                  <form key={column.status} action="/api/interns" method="post">
                    <input type="hidden" name="intent" value="task-status" />
                    <input type="hidden" name="taskId" value={selected.id} />
                    <input type="hidden" name="status" value={column.status} />
                    <button className="btn-secondary">Move to {column.label}</button>
                  </form>
                ))}
              </div>
              <h3 className="mt-6 font-medium">Notes</h3>
              <ul className="mt-2 space-y-3">
                {selected.notes.length === 0 ? <li className="text-sm text-ink/45">No notes yet.</li> : null}
                {selected.notes.map((note) => (
                  <li key={note.id} className="rounded-md bg-paper/80 p-3 text-sm">
                    <p className="break-words">{note.body}</p>
                    <p className="mt-1 text-xs text-ink/45">
                      {note.authorName} · {note.createdAt.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </p>
                  </li>
                ))}
              </ul>
              <form action="/api/interns" method="post" className="mt-3 space-y-2">
                <input type="hidden" name="intent" value="task-note" />
                <input type="hidden" name="taskId" value={selected.id} />
                <label className="block text-sm font-medium">
                  Add a note
                  <textarea name="body" required rows={3} placeholder="What changed, or what you need." className="field" />
                </label>
                <button className="btn">Save note</button>
              </form>
            </>
          ) : (
            <>
              <h2 className="font-display text-xl font-semibold tracking-tight">Open a task</h2>
              <p className="mt-2 text-sm text-ink/60">
                Choose a card to see the details, move it, or leave a note. Chat is still there for the wider conversation.
              </p>
              <Link href="/intern/chat" className="link-accent mt-4 inline-block text-sm">
                Go to team chat
              </Link>
            </>
          )}
        </aside>
      </div>
    </Shell>
  );
}
