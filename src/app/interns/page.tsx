import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isLeadOrAdmin } from "@/lib/access";
import { Guide } from "@/components/guide";
import { Notice, Shell } from "@/components/shell";
import { accessOverview } from "@/lib/gate";
import { fieldsToSpec, parseFields } from "@/lib/forms";
import { prisma } from "@/lib/db";

export default async function InternsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const user = await getSession();
  if (!user) redirect("/login");
  if (!isLeadOrAdmin(user)) redirect("/workspace");
  const { error, notice } = await searchParams;
  const [{ coaches, interns }, packets, teams] = await Promise.all([
    accessOverview(),
    prisma.accessPacket.findMany({ orderBy: [{ audience: "asc" }, { sortOrder: "asc" }] }),
    prisma.internTeam.findMany({ include: { interns: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <Shell user={user}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-caps text-accent">Access</p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">Interns and coach forms</h1>
          <p className="mt-2 max-w-2xl text-ink/60">
            Watch who is still signing. A coach with forms incomplete can sign in, but their students stay hidden. An
            intern needs both badges signed before team chat opens.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/intern/tasks" className="btn-secondary">
            Task board
          </Link>
          <Link href="/interns/chat" className="btn-secondary">
            Program chat
          </Link>
          <Link href="/intern/documents" className="btn-secondary">
            Documents
          </Link>
          <Link href="/interns/new" className="btn">
            Enroll intern
          </Link>
        </div>
      </div>
      <Guide
        steps={[
          { title: "Enroll", body: "Add the intern and a parent email. Each gets a login with their own temporary password, shown to you once." },
          { title: "They sign", body: "The intern signs their forms. The parent signs separately. You can see both badges here." },
          { title: "They collaborate", body: "Program chat and Documents let you read every team. A team's private channel is not visible to other teams." },
        ]}
      />
      <Notice error={error} notice={notice} />

      <section id="coaches" className="mt-8">
        <h2 className="font-display text-2xl font-semibold tracking-tight">Coaches</h2>
        <p className="mt-1 text-sm text-ink/55">Workspace open means their students, calendar, and chat are available.</p>
        <ul className="mt-3 divide-y divide-ink/10 rounded-xl border border-ink/10 bg-white">
          {coaches.length === 0 ? <li className="p-4 text-sm text-ink/55">No active coaches.</li> : null}
          {coaches.map((coach) => (
            <li key={coach.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="font-medium">{coach.name}</p>
                <p className="text-sm text-ink/50">{coach.email}</p>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${coach.formsDone ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
                {coach.formsDone ? "Workspace open" : "Forms incomplete"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold tracking-tight">Interns</h2>
        <p className="mt-1 text-sm text-ink/55">Both badges must say signed. Parents can check status. They do not see team chat.</p>
        <ul className="mt-3 divide-y divide-ink/10 rounded-xl border border-ink/10 bg-white">
          {interns.length === 0 ? <li className="p-4 text-sm text-ink/55">No interns yet.</li> : null}
          {interns.map((intern) => (
            <li key={intern.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="font-medium">
                  {intern.firstName} {intern.lastName}{" "}
                  <span className="font-normal text-ink/45">{intern.publicId}</span>
                </p>
                <p className="text-sm text-ink/50">
                  {intern.team.name} · {intern.email} · parent {intern.parentName} ({intern.parentEmail})
                </p>
              </div>
              <div className="flex gap-2 text-xs font-medium">
                <span className={`rounded-full px-2.5 py-0.5 ${intern.internDone ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
                  Intern {intern.internDone ? "signed" : "pending"}
                </span>
                <span className={`rounded-full px-2.5 py-0.5 ${intern.parentDone ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
                  Parent {intern.parentDone ? "signed" : "pending"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight">Teams</h2>
          <ul className="mt-3 space-y-2">
            {teams.map((team) => (
              <li key={team.id} className="rounded-xl border border-ink/10 bg-white px-4 py-3">
                <p className="font-medium">{team.name}</p>
                <p className="text-sm text-ink/50">
                  {team.focus || "No focus yet"} · {team.interns.length} intern{team.interns.length === 1 ? "" : "s"}
                </p>
              </li>
            ))}
          </ul>
        </div>
        <form action="/api/interns" method="post" className="panel space-y-3 rounded-xl p-5">
          <input type="hidden" name="intent" value="team" />
          <h2 className="font-display text-xl font-semibold tracking-tight">Add a team</h2>
          <label className="block text-sm font-medium">
            Name
            <input name="name" required className="field" />
          </label>
          <label className="block text-sm font-medium">
            Focus
            <input name="focus" className="field" placeholder="Outreach, studio…" />
          </label>
          <label className="block text-sm font-medium">
            What this team does
            <textarea name="description" rows={2} className="field" />
          </label>
          <button className="btn">Add team</button>
        </form>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold tracking-tight">Forms they sign</h2>
        <p className="mt-2 max-w-2xl text-sm text-ink/60">
          These are drafts. Saving new wording asks everyone to sign that form again. Screening files and background
          checks stay in coach onboarding, not here.
        </p>
        <div className="mt-4 space-y-4">
          {packets.map((packet) => (
            <details key={packet.id} className="panel rounded-xl">
              <summary className="cursor-pointer px-5 py-4 font-medium">
                {packet.title}
                <span className="ml-2 text-sm font-normal text-ink/45">
                  {packet.audience === "coach" ? "Coach" : packet.audience === "intern" ? "Intern" : "Intern parent"}
                </span>
              </summary>
            <form action="/api/interns" method="post" className="space-y-3 border-t border-ink/10 px-5 py-4">
              <input type="hidden" name="intent" value="packet" />
              <input type="hidden" name="packetId" value={packet.id} />
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/40">
                Open this only to change the wording. Saving a change asks everyone to sign this form again.
              </p>
              <label className="block text-sm font-medium">
                Title
                <input name="title" defaultValue={packet.title} className="field" />
              </label>
              <label className="block text-sm font-medium">
                Short description
                <input name="description" defaultValue={packet.description} className="field" />
              </label>
              {packet.kind === "signature" ? (
                <label className="block text-sm font-medium">
                  Agreement
                  <textarea name="body" rows={6} defaultValue={packet.body} className="field" />
                </label>
              ) : (
                <label className="block text-sm font-medium">
                  Questions
                  <span className="mt-1 block font-normal text-ink/50">One per line: type | question | options separated by semicolons.</span>
                  <textarea name="spec" rows={6} defaultValue={fieldsToSpec(parseFields(packet.schemaJson))} className="field font-mono text-xs" />
                </label>
              )}
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="active" value="1" defaultChecked={packet.active} />
                Required before access
              </label>
              <button className="btn-secondary">Save form</button>
            </form>
            </details>
          ))}
        </div>
      </section>
    </Shell>
  );
}
