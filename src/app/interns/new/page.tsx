import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isLeadOrAdmin } from "@/lib/access";
import { Notice, Shell } from "@/components/shell";
import { prisma } from "@/lib/db";

export default async function EnrollInternPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getSession();
  if (!user) redirect("/login");
  if (!isLeadOrAdmin(user)) redirect("/workspace");
  const { error } = await searchParams;
  const teams = await prisma.internTeam.findMany({ orderBy: { name: "asc" } });

  return (
    <Shell user={user}>
      <p className="text-sm">
        <Link href="/interns" className="link-accent">
          ← Interns
        </Link>
      </p>
      <p className="label-caps mt-4 text-accent">Teen interns</p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">Add interns</h1>
      <p className="mt-3 max-w-2xl text-ink/60">
        This year&apos;s intern and parent forms are already signed, so they&apos;re marked on file automatically and
        each intern&apos;s workspace opens right away. Interns sign in with Google using the email you enter here, or
        with the temporary password you&apos;ll see once at the top of the next page.
      </p>
      <Notice error={error} />

      <form action="/api/interns" method="post" className="panel mt-8 grid max-w-2xl gap-5 rounded-xl p-6">
        <input type="hidden" name="intent" value="enroll-many" />
        <h2 className="font-display text-xl font-semibold">Paste a list</h2>
        <label className="block text-sm font-medium">
          One intern per line: name, then email
          <textarea
            name="list"
            rows={8}
            required
            className="field font-mono text-sm"
            placeholder={"Maya Chen, maya@example.com\nLeo Park, leo@example.com"}
          />
          <span className="mt-1 block text-xs font-normal text-ink/55">
            You can copy two columns (name and email) straight from a spreadsheet.
          </span>
        </label>
        <label className="block text-sm font-medium">
          Team
          <select name="teamId" className="field" defaultValue={teams[0]?.id ?? ""}>
            <option value="">New team, named below</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
                {team.focus ? ` · ${team.focus}` : ""}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            New team name
            <input name="newTeam" className="field" placeholder="Only if creating a team" />
          </label>
          <label className="block text-sm font-medium">
            Team focus
            <input name="newFocus" className="field" placeholder="Studio, outreach…" />
          </label>
        </div>
        <button className="btn w-fit">Add interns</button>
      </form>

      <details className="mt-6 max-w-2xl">
        <summary className="cursor-pointer text-sm font-medium text-ink/70">Add one intern with parent details</summary>
        <form action="/api/interns" method="post" className="panel mt-4 grid gap-5 rounded-xl p-6">
          <input type="hidden" name="intent" value="enroll" />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              First name
              <input name="firstName" required className="field" />
            </label>
            <label className="block text-sm font-medium">
              Last name
              <input name="lastName" className="field" />
            </label>
            <label className="block text-sm font-medium sm:col-span-2">
              Intern email
              <input type="email" name="email" required className="field" />
            </label>
            <label className="block text-sm font-medium">
              Parent name (optional)
              <input name="parentName" className="field" />
            </label>
            <label className="block text-sm font-medium">
              Parent email (optional)
              <input type="email" name="parentEmail" className="field" />
            </label>
            <label className="block text-sm font-medium sm:col-span-2">
              Parent phone (optional)
              <input name="parentPhone" className="field" />
            </label>
          </div>
          <label className="block text-sm font-medium">
            Team
            <select name="teamId" className="field" defaultValue={teams[0]?.id ?? ""}>
              <option value="">New team, named below</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                    {team.name}
                    {team.focus ? ` · ${team.focus}` : ""}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              New team name
              <input name="newTeam" className="field" placeholder="Only if creating a team" />
            </label>
            <label className="block text-sm font-medium">
              Team focus
              <input name="newFocus" className="field" placeholder="Studio, outreach…" />
            </label>
          </div>
          <button className="btn w-fit">Add intern</button>
        </form>
      </details>
    </Shell>
  );
}
