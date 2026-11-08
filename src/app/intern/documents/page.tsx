import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isLeadOrAdmin } from "@/lib/access";
import { Notice, Shell } from "@/components/shell";
import { internClearance, internRecord } from "@/lib/gate";
import { prisma } from "@/lib/db";

export default async function InternDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
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

  const { error, notice } = await searchParams;
  const documents = await prisma.internDocument.findMany({
    where: manager ? {} : { OR: [{ teamId: null }, { teamId: intern?.teamId ?? "" }] },
    include: { team: true },
    orderBy: { createdAt: "desc" },
  });
  const teams = manager ? await prisma.internTeam.findMany({ orderBy: { name: "asc" } }) : [];

  return (
    <Shell user={user}>
      <p className="label-caps text-accent">Interns</p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">Shared documents</h1>
      <p className="mt-2 max-w-2xl text-ink/60">
        Share a note with your team, or with every intern. You only see your team&apos;s documents and the ones marked for everyone.
      </p>
      <Notice error={error} notice={notice} />

      <form action="/api/interns" method="post" className="panel mt-6 max-w-2xl space-y-4 rounded-xl p-5">
        <input type="hidden" name="intent" value="document" />
        <h2 className="font-display text-xl font-semibold tracking-tight">Share a document</h2>
        <p className="text-sm text-ink/55">
          A team document stays with that team. Choose all interns when another team needs it too. Paste the note or a link.
        </p>
        <label className="block text-sm font-medium">
          Title
          <input name="title" required className="field" />
        </label>
        <label className="block text-sm font-medium">
          Who can read it
          <select name="audience" className="field">
            {intern ? <option value="team">My team · {intern.team.name}</option> : null}
            <option value="all">All interns</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name} only
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium">
          Document
          <textarea name="body" required rows={5} className="field" placeholder="Paste the note, plan, or link." />
        </label>
        <button className="btn">Share</button>
      </form>

      <ul className="mt-6 space-y-4">
        {documents.length === 0 ? <li className="text-sm text-ink/55">Nothing shared yet.</li> : null}
        {documents.map((doc) => (
          <li key={doc.id} className="panel rounded-xl p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-xl font-semibold tracking-tight">{doc.title}</h2>
              <p className="text-xs uppercase tracking-[0.14em] text-ink/40">{doc.team?.name ?? "All interns"}</p>
            </div>
            <p className="mt-1 text-sm text-ink/50">
              {doc.authorName} · {doc.createdAt.toLocaleDateString()}
            </p>
            <div className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink/80">{doc.body}</div>
          </li>
        ))}
      </ul>
    </Shell>
  );
}
