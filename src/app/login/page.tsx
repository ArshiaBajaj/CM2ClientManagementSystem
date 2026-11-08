import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Shell } from "@/components/shell";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getSession();
  if (user) redirect("/workspace");
  const { error } = await searchParams;

  return (
    <Shell user={null}>
      <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="stagger">
          <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Workspace sign in
          </h1>
          <p className="mt-4 max-w-md text-ink/65">
            Sign in with the email for your role. The next screen tells you if a form still needs a signature.
          </p>
          <ul className="mt-6 max-w-md space-y-3 text-sm text-ink/70">
            <li><span className="font-medium text-ink">Coaches</span> finish their forms, then see only their students.</li>
            <li><span className="font-medium text-ink">Interns and parents</span> both sign. Then the intern gets tasks, team chat, and shared documents. Parents do not see that board.</li>
            <li><span className="font-medium text-ink">Teens and families</span> use the coaching space for sessions, goals, and their coach. That login is separate from intern tasks.</li>
            <li><span className="font-medium text-ink">Managers</span> see every student, plus who still owes a form.</li>
          </ul>
        </div>

        <div className="panel rounded-2xl p-7 shadow-soft">
          {error ? (
            <p className="mb-4 rounded-md bg-signal/10 px-3 py-2 text-sm text-signal">{error}</p>
          ) : null}
          <form action="/api/auth/login" method="post" className="space-y-4">
            <label className="block text-sm font-medium">
              Email
              <input
                name="email"
                type="email"
                required
                className="field bg-white"
                defaultValue="lead@coachme2.org"
              />
            </label>
            <label className="block text-sm font-medium">
              Password
              <input
                name="password"
                type="password"
                required
                className="field bg-white"
                defaultValue="demo1234"
              />
            </label>
            <p className="text-sm text-ink/55">The manager preview is filled in. Password for every preview account is demo1234.</p>
            <button className="btn w-full py-3">Continue</button>
          </form>
          <div className="mt-6 border-t border-ink/10 pt-4 text-sm">
            <p className="font-medium">Other preview accounts</p>
            <ul className="mt-2 space-y-1.5 text-ink/70">
              <li>Coach, forms still open · pending.coach@example.com</li>
              <li>Coach, students open · coach@example.com</li>
              <li>Intern, team open · maya.chen@example.com</li>
              <li>Intern, waiting on a parent · leo.park@example.com</li>
              <li>Parent, still signing · sam.park@example.com</li>
              <li>Student · teen@example.com · Family · guardian@example.com</li>
            </ul>
          </div>
        </div>
      </div>
    </Shell>
  );
}
