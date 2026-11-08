import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isLeadOrAdmin } from "@/lib/access";
import { Guide } from "@/components/guide";
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
      <p className="label-caps mt-4 text-accent">Teen intern</p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">Enroll an intern</h1>
      <p className="mt-3 max-w-2xl text-ink/60">
        Use a different email for the intern and the parent. If you leave Team as “New team,” type a name below.
        Otherwise pick Studio, Outreach, or a team you already added.
      </p>
      <Guide
        steps={[
          { title: "Create the logins", body: "Both people can sign in with the temporary password demo1234 and will be asked to choose their own." },
          { title: "They sign", body: "The intern sees their agreements. The parent sees the permission forms. Either can sign first." },
          { title: "Chat opens", body: "When both are signed, the intern gets Home, Team chat, and Documents. You can follow along from Program chat." },
        ]}
      />
      <Notice error={error} />

      <form action="/api/interns" method="post" className="panel mt-8 grid max-w-2xl gap-5 rounded-xl p-6">
        <input type="hidden" name="intent" value="enroll" />
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            First name
            <input name="firstName" required className="field" />
          </label>
          <label className="block text-sm font-medium">
            Last name
            <input name="lastName" required className="field" />
          </label>
          <label className="block text-sm font-medium sm:col-span-2">
            Intern email
            <input type="email" name="email" required className="field" />
          </label>
          <label className="block text-sm font-medium">
            Parent name
            <input name="parentName" required className="field" />
          </label>
          <label className="block text-sm font-medium">
            Parent email
            <input type="email" name="parentEmail" required className="field" />
          </label>
          <label className="block text-sm font-medium sm:col-span-2">
            Parent phone
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
        <button className="btn w-fit">Enroll intern</button>
      </form>
    </Shell>
  );
}
